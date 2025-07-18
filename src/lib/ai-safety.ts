import { auditLogger } from './audit-logger';

export interface SafetyCheck {
  passed: boolean;
  confidence: number;
  reasons: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  suggestedActions: string[];
}

export interface HallucinationCheck {
  isHallucination: boolean;
  confidence: number;
  inconsistencies: string[];
  factualConcerns: string[];
  recommendedVerification: string[];
}

export interface ContentSafetyFilter {
  isAppropriate: boolean;
  violations: string[];
  category: 'safe' | 'medical_advice' | 'harmful' | 'inappropriate';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class AISafetyService {
  private readonly medicalDisclaimers = [
    'This is for informational purposes only and not medical advice.',
    'Always consult with a qualified healthcare provider.',
    'This information should not replace professional medical consultation.',
    'Please verify this information with your healthcare provider.'
  ];

  private readonly harmfulPatterns = [
    /diagnos(e|is|ing)/i,
    /you (have|are|should)/i,
    /treatment (plan|recommendation)/i,
    /stop taking/i,
    /increase (dose|dosage)/i,
    /decrease (dose|dosage)/i,
    /emergency.*room/i,
    /call.*911/i,
    /life.*threatening/i,
    /prescription/i,
    /medical.*emergency/i
  ];

  private readonly medicalTerms = [
    'symptom', 'diagnosis', 'treatment', 'medication', 'prescription',
    'disease', 'condition', 'therapy', 'surgery', 'procedure',
    'drug', 'dose', 'dosage', 'side effect', 'adverse'
  ];

  private readonly contradictoryPhrases = [
    ['safe', 'dangerous'],
    ['increase', 'decrease'],
    ['high', 'low'],
    ['positive', 'negative'],
    ['normal', 'abnormal'],
    ['benign', 'malignant']
  ];

  /**
   * Comprehensive safety check for AI-generated content
   */
  async performSafetyCheck(
    content: string,
    userRole: string,
    userId: string
  ): Promise<SafetyCheck> {
    const checks = await Promise.all([
      this.checkMedicalAdvice(content),
      this.checkHarmfulContent(content),
      this.checkDisclaimerPresence(content),
      this.checkRoleAppropriateness(content, userRole),
      this.checkFactualConsistency(content)
    ]);

    const failedChecks = checks.filter(check => !check.passed);
    const passed = failedChecks.length === 0;
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (failedChecks.length > 3) riskLevel = 'critical';
    else if (failedChecks.length > 2) riskLevel = 'high';
    else if (failedChecks.length > 1) riskLevel = 'medium';

    const reasons = failedChecks.flatMap(check => check.reasons);
    const suggestedActions = failedChecks.flatMap(check => check.suggestedActions);

    // Log safety check
    await auditLogger.logEvent({
      event_type: 'ai_response_generated',
      user_id: userId,
      details: {
        content_length: content.length,
        safety_passed: passed,
        risk_level: riskLevel,
        failed_checks: failedChecks.length,
        reasons: reasons.slice(0, 5) // Limit for storage
      },
      risk_level: riskLevel,
      compliance_relevant: true,
      phi_involved: true
    });

    return {
      passed,
      confidence: this.calculateOverallConfidence(checks),
      reasons,
      riskLevel,
      suggestedActions
    };
  }

  /**
   * Check for potential hallucinations in AI responses
   */
  async checkHallucination(
    content: string,
    context: string,
    userQuery: string
  ): Promise<HallucinationCheck> {
    const inconsistencies: string[] = [];
    const factualConcerns: string[] = [];
    const recommendedVerification: string[] = [];

    // Check for contradictory statements
    const contradictions = this.findContradictions(content);
    if (contradictions.length > 0) {
      inconsistencies.push(...contradictions);
    }

    // Check for overly specific medical claims
    const specificClaims = this.findSpecificMedicalClaims(content);
    if (specificClaims.length > 0) {
      factualConcerns.push(...specificClaims);
      recommendedVerification.push('Verify specific medical claims with recent literature');
    }

    // Check for context misalignment
    if (!this.isContextAligned(content, context)) {
      inconsistencies.push('Response does not align with provided context');
    }

    // Check for query relevance
    if (!this.isQueryRelevant(content, userQuery)) {
      inconsistencies.push('Response does not adequately address the user query');
    }

    const isHallucination = inconsistencies.length > 0 || factualConcerns.length > 0;
    const confidence = this.calculateHallucinationConfidence(inconsistencies, factualConcerns);

    return {
      isHallucination,
      confidence,
      inconsistencies,
      factualConcerns,
      recommendedVerification
    };
  }

  /**
   * Filter content for appropriate healthcare communication
   */
  filterContent(content: string, userRole: string): ContentSafetyFilter {
    const violations: string[] = [];
    let category: 'safe' | 'medical_advice' | 'harmful' | 'inappropriate' = 'safe';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check for direct medical advice
    if (this.containsMedicalAdvice(content)) {
      violations.push('Contains potential medical advice');
      category = 'medical_advice';
      severity = 'high';
    }

    // Check for harmful content
    if (this.containsHarmfulContent(content)) {
      violations.push('Contains potentially harmful medical information');
      category = 'harmful';
      severity = 'critical';
    }

    // Check for inappropriate content for user role
    if (!this.isRoleAppropriate(content, userRole)) {
      violations.push(`Content not appropriate for ${userRole} role`);
      category = 'inappropriate';
      severity = 'medium';
    }

    return {
      isAppropriate: violations.length === 0,
      violations,
      category,
      severity
    };
  }

  /**
   * Add appropriate disclaimers to AI responses
   */
  addDisclaimers(content: string, userRole: string): string {
    const disclaimer = this.getDisclaimerForRole(userRole);
    
    // Check if disclaimer already exists
    if (content.toLowerCase().includes('not medical advice') || 
        content.toLowerCase().includes('consult') && content.toLowerCase().includes('healthcare')) {
      return content;
    }

    return `${content}\n\n⚠️ **Important:** ${disclaimer}`;
  }

  /**
   * Human-in-the-loop validation requirement
   */
  requiresHumanValidation(
    content: string,
    safetyCheck: SafetyCheck,
    userRole: string
  ): boolean {
    // Always require validation for critical risk
    if (safetyCheck.riskLevel === 'critical') return true;

    // Require validation for high-risk medical advice
    if (safetyCheck.riskLevel === 'high' && this.containsMedicalAdvice(content)) return true;

    // Require validation for patient-facing content with medical terms
    if (userRole === 'user' && this.containsComplexMedicalTerms(content)) return true;

    // Require validation for medication-related content
    if (this.containsMedicationAdvice(content)) return true;

    return false;
  }

  private async checkMedicalAdvice(content: string): Promise<SafetyCheck> {
    const containsAdvice = this.containsMedicalAdvice(content);
    const hasDisclaimer = this.hasAppropriateDisclaimer(content);

    return {
      passed: !containsAdvice || hasDisclaimer,
      confidence: 0.85,
      reasons: containsAdvice && !hasDisclaimer ? ['Contains medical advice without disclaimer'] : [],
      riskLevel: containsAdvice && !hasDisclaimer ? 'high' : 'low',
      suggestedActions: containsAdvice && !hasDisclaimer ? ['Add medical disclaimer'] : []
    };
  }

  private async checkHarmfulContent(content: string): Promise<SafetyCheck> {
    const isHarmful = this.containsHarmfulContent(content);

    return {
      passed: !isHarmful,
      confidence: 0.90,
      reasons: isHarmful ? ['Contains potentially harmful medical information'] : [],
      riskLevel: isHarmful ? 'critical' : 'low',
      suggestedActions: isHarmful ? ['Remove harmful content', 'Add safety warnings'] : []
    };
  }

  private async checkDisclaimerPresence(content: string): Promise<SafetyCheck> {
    const needsDisclaimer = this.needsDisclaimer(content);
    const hasDisclaimer = this.hasAppropriateDisclaimer(content);

    return {
      passed: !needsDisclaimer || hasDisclaimer,
      confidence: 0.95,
      reasons: needsDisclaimer && !hasDisclaimer ? ['Missing required disclaimer'] : [],
      riskLevel: needsDisclaimer && !hasDisclaimer ? 'medium' : 'low',
      suggestedActions: needsDisclaimer && !hasDisclaimer ? ['Add appropriate disclaimer'] : []
    };
  }

  private async checkRoleAppropriateness(content: string, userRole: string): Promise<SafetyCheck> {
    const isAppropriate = this.isRoleAppropriate(content, userRole);

    return {
      passed: isAppropriate,
      confidence: 0.80,
      reasons: !isAppropriate ? [`Content not appropriate for ${userRole} role`] : [],
      riskLevel: !isAppropriate ? 'medium' : 'low',
      suggestedActions: !isAppropriate ? ['Adjust content for user role'] : []
    };
  }

  private async checkFactualConsistency(content: string): Promise<SafetyCheck> {
    const contradictions = this.findContradictions(content);
    const hasInconsistencies = contradictions.length > 0;

    return {
      passed: !hasInconsistencies,
      confidence: 0.75,
      reasons: hasInconsistencies ? ['Contains contradictory information'] : [],
      riskLevel: hasInconsistencies ? 'medium' : 'low',
      suggestedActions: hasInconsistencies ? ['Review for consistency'] : []
    };
  }

  private containsMedicalAdvice(content: string): boolean {
    return this.harmfulPatterns.some(pattern => pattern.test(content));
  }

  private containsHarmfulContent(content: string): boolean {
    const harmfulPhrases = [
      'stop taking your medication',
      'ignore your doctor',
      'don\'t see a doctor',
      'emergency room is unnecessary',
      'this will cure'
    ];

    return harmfulPhrases.some(phrase => 
      content.toLowerCase().includes(phrase.toLowerCase())
    );
  }

  private hasAppropriateDisclaimer(content: string): boolean {
    return this.medicalDisclaimers.some(disclaimer => 
      content.toLowerCase().includes(disclaimer.toLowerCase().substring(0, 20))
    );
  }

  private needsDisclaimer(content: string): boolean {
    return this.medicalTerms.some(term => 
      content.toLowerCase().includes(term.toLowerCase())
    );
  }

  private isRoleAppropriate(content: string, userRole: string): boolean {
    // Admin and providers can see more technical content
    if (userRole === 'admin' || userRole === 'provider') return true;

    // Patients should get simplified explanations
    const technicalTerms = content.match(/\b[A-Z]{3,}\b/g) || [];
    return technicalTerms.length < 5; // Arbitrary threshold
  }

  private findContradictions(content: string): string[] {
    const contradictions: string[] = [];
    
    this.contradictoryPhrases.forEach(([term1, term2]) => {
      if (content.toLowerCase().includes(term1) && content.toLowerCase().includes(term2)) {
        contradictions.push(`Contains both '${term1}' and '${term2}'`);
      }
    });

    return contradictions;
  }

  private findSpecificMedicalClaims(content: string): string[] {
    const claims: string[] = [];
    
    // Look for specific percentages or statistics
    const statsPattern = /\b\d+(\.\d+)?%\b/g;
    const stats = content.match(statsPattern);
    if (stats && stats.length > 2) {
      claims.push('Contains specific medical statistics');
    }

    // Look for definitive statements
    const definitivePattern = /\b(always|never|definitely|certainly)\b/gi;
    const definitive = content.match(definitivePattern);
    if (definitive && definitive.length > 0) {
      claims.push('Contains definitive medical statements');
    }

    return claims;
  }

  private isContextAligned(content: string, context: string): boolean {
    if (!context) return true;
    
    const contextWords = context.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    const overlap = contextWords.filter(word => contentWords.includes(word));
    return overlap.length / contextWords.length > 0.1; // 10% overlap threshold
  }

  private isQueryRelevant(content: string, query: string): boolean {
    if (!query) return true;
    
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    const overlap = queryWords.filter(word => contentWords.includes(word));
    return overlap.length / queryWords.length > 0.2; // 20% overlap threshold
  }

  private calculateOverallConfidence(checks: SafetyCheck[]): number {
    const totalConfidence = checks.reduce((sum, check) => sum + check.confidence, 0);
    return totalConfidence / checks.length;
  }

  private calculateHallucinationConfidence(
    inconsistencies: string[],
    factualConcerns: string[]
  ): number {
    const totalIssues = inconsistencies.length + factualConcerns.length;
    return Math.max(0, 1 - (totalIssues * 0.2)); // Reduce confidence by 20% per issue
  }

  private getDisclaimerForRole(userRole: string): string {
    switch (userRole) {
      case 'admin':
        return 'This information is for administrative purposes and should be verified with clinical staff.';
      case 'provider':
        return 'This AI-generated information should supplement, not replace, your clinical judgment.';
      case 'user':
      default:
        return 'This information is for educational purposes only and not medical advice. Always consult with your healthcare provider.';
    }
  }

  private containsComplexMedicalTerms(content: string): boolean {
    const complexTerms = [
      'myocardial infarction', 'cerebrovascular accident', 'pneumothorax',
      'septicemia', 'anaphylaxis', 'arrhythmia', 'thrombosis'
    ];
    
    return complexTerms.some(term => 
      content.toLowerCase().includes(term.toLowerCase())
    );
  }

  private containsMedicationAdvice(content: string): boolean {
    const medicationPatterns = [
      /take.*mg/i,
      /stop.*medication/i,
      /increase.*dose/i,
      /decrease.*dose/i,
      /prescription/i,
      /drug.*interaction/i
    ];
    
    return medicationPatterns.some(pattern => pattern.test(content));
  }
}

export const aiSafetyService = new AISafetyService();