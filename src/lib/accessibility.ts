import { auditLogger } from './audit-logger';

export interface AccessibilityFeatures {
  screenReader: boolean;
  highContrast: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
  voiceInput: boolean;
  colorBlindSupport: boolean;
  reducedMotion: boolean;
  autoPlay: boolean;
  announcements: boolean;
}

export interface AccessibilityError {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  element?: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  suggestion: string;
}

export interface VoiceCommand {
  command: string;
  action: string;
  context: string;
  confidence: number;
}

export interface AccessibilityPreferences {
  userId: string;
  features: AccessibilityFeatures;
  customColors: {
    background: string;
    text: string;
    links: string;
    buttons: string;
  };
  fontSize: number;
  language: string;
  announcements: boolean;
  shortcuts: Record<string, string>;
}

class AccessibilityService {
  private preferences: Map<string, AccessibilityPreferences> = new Map();
  private speechSynthesis: SpeechSynthesis | null = null;
  private speechRecognition: any = null;
  private isListening = false;
  private shortcuts: Map<string, () => void> = new Map();

  constructor() {
    this.initializeSpeechServices();
    this.initializeKeyboardShortcuts();
    this.detectSystemPreferences();
  }

  private initializeSpeechServices(): void {
    if (typeof window !== 'undefined') {
      // Initialize speech synthesis
      this.speechSynthesis = window.speechSynthesis;

      // Initialize speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.continuous = true;
        this.speechRecognition.interimResults = true;
        this.speechRecognition.lang = 'en-US';
      }
    }
  }

  private initializeKeyboardShortcuts(): void {
    if (typeof window !== 'undefined') {
      // Common accessibility shortcuts
      this.shortcuts.set('Alt+1', () => this.skipToMainContent());
      this.shortcuts.set('Alt+2', () => this.skipToNavigation());
      this.shortcuts.set('Alt+3', () => this.skipToSearch());
      this.shortcuts.set('Alt+H', () => this.toggleHighContrast());
      this.shortcuts.set('Alt+L', () => this.toggleLargeText());
      this.shortcuts.set('Alt+R', () => this.toggleScreenReader());
      this.shortcuts.set('Alt+V', () => this.toggleVoiceInput());
      this.shortcuts.set('Ctrl+/', () => this.showKeyboardHelp());
      this.shortcuts.set('Escape', () => this.dismissOverlays());

      // Add keyboard event listener
      document.addEventListener('keydown', this.handleKeyboardShortcut.bind(this));
    }
  }

  private detectSystemPreferences(): void {
    if (typeof window !== 'undefined') {
      const mediaQueries = {
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
        highContrast: window.matchMedia('(prefers-contrast: high)'),
        darkMode: window.matchMedia('(prefers-color-scheme: dark)'),
        largeFonts: window.matchMedia('(min-resolution: 2dppx)')
      };

      Object.entries(mediaQueries).forEach(([key, query]) => {
        query.addEventListener('change', () => {
          this.updateSystemPreferences(key, query.matches);
        });
      });
    }
  }

  async setUserPreferences(userId: string, preferences: Partial<AccessibilityPreferences>): Promise<void> {
    const existing = this.preferences.get(userId) || this.getDefaultPreferences(userId);
    const updated = { ...existing, ...preferences };
    
    this.preferences.set(userId, updated);
    await this.applyPreferences(updated);

    // Log accessibility preference change
    await auditLogger.logEvent({
      event_type: 'user_updated',
      user_id: userId,
      details: {
        action: 'accessibility_preferences_updated',
        preferences: preferences
      },
      risk_level: 'low',
      compliance_relevant: false,
      phi_involved: false
    });
  }

  getUserPreferences(userId: string): AccessibilityPreferences {
    return this.preferences.get(userId) || this.getDefaultPreferences(userId);
  }

  private getDefaultPreferences(userId: string): AccessibilityPreferences {
    return {
      userId,
      features: {
        screenReader: false,
        highContrast: false,
        largeText: false,
        keyboardNavigation: true,
        voiceInput: false,
        colorBlindSupport: false,
        reducedMotion: false,
        autoPlay: false,
        announcements: true
      },
      customColors: {
        background: '#ffffff',
        text: '#000000',
        links: '#0066cc',
        buttons: '#0066cc'
      },
      fontSize: 16,
      language: 'en-US',
      announcements: true,
      shortcuts: {}
    };
  }

  private async applyPreferences(preferences: AccessibilityPreferences): Promise<void> {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    
    // Apply high contrast
    if (preferences.features.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply large text
    if (preferences.features.largeText) {
      root.style.fontSize = `${preferences.fontSize * 1.25}px`;
    } else {
      root.style.fontSize = `${preferences.fontSize}px`;
    }

    // Apply reduced motion
    if (preferences.features.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Apply custom colors
    root.style.setProperty('--bg-color', preferences.customColors.background);
    root.style.setProperty('--text-color', preferences.customColors.text);
    root.style.setProperty('--link-color', preferences.customColors.links);
    root.style.setProperty('--button-color', preferences.customColors.buttons);

    // Apply screen reader optimizations
    if (preferences.features.screenReader) {
      root.classList.add('screen-reader-optimized');
    } else {
      root.classList.remove('screen-reader-optimized');
    }
  }

  async announce(message: string, priority: 'polite' | 'assertive' = 'polite'): Promise<void> {
    if (typeof document === 'undefined') return;

    // Create or update ARIA live region
    let liveRegion = document.getElementById('accessibility-announcements');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'accessibility-announcements';
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }

    liveRegion.textContent = message;

    // Also use speech synthesis if available
    if (this.speechSynthesis && this.speechSynthesis.speaking === false) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      this.speechSynthesis.speak(utterance);
    }
  }

  async startVoiceInput(): Promise<void> {
    if (!this.speechRecognition) {
      throw new Error('Speech recognition not supported');
    }

    this.isListening = true;
    this.speechRecognition.start();

    this.speechRecognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      const confidence = event.results[event.results.length - 1][0].confidence;
      
      this.processVoiceCommand(transcript, confidence);
    };

    this.speechRecognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
    };

    await this.announce('Voice input activated', 'assertive');
  }

  stopVoiceInput(): void {
    if (this.speechRecognition && this.isListening) {
      this.speechRecognition.stop();
      this.isListening = false;
      this.announce('Voice input deactivated', 'polite');
    }
  }

  private async processVoiceCommand(transcript: string, confidence: number): Promise<void> {
    const command = transcript.toLowerCase().trim();
    
    const voiceCommand: VoiceCommand = {
      command,
      action: '',
      context: 'general',
      confidence
    };

    // Basic voice commands
    if (command.includes('scroll up')) {
      window.scrollBy(0, -200);
      voiceCommand.action = 'scroll_up';
    } else if (command.includes('scroll down')) {
      window.scrollBy(0, 200);
      voiceCommand.action = 'scroll_down';
    } else if (command.includes('go to top')) {
      window.scrollTo(0, 0);
      voiceCommand.action = 'scroll_to_top';
    } else if (command.includes('go to bottom')) {
      window.scrollTo(0, document.body.scrollHeight);
      voiceCommand.action = 'scroll_to_bottom';
    } else if (command.includes('click') || command.includes('select')) {
      // Find and click the most relevant element
      const element = this.findElementByText(command);
      if (element) {
        (element as HTMLElement).click();
        voiceCommand.action = 'click_element';
      }
    } else if (command.includes('help')) {
      this.showVoiceHelp();
      voiceCommand.action = 'show_help';
    } else if (command.includes('stop listening')) {
      this.stopVoiceInput();
      voiceCommand.action = 'stop_listening';
    }

    // Log voice command usage
    await auditLogger.logEvent({
      event_type: 'data_accessed',
      details: {
        action: 'voice_command_processed',
        command: voiceCommand.command,
        action_taken: voiceCommand.action,
        confidence: voiceCommand.confidence
      },
      risk_level: 'low',
      compliance_relevant: false,
      phi_involved: false
    });
  }

  private findElementByText(command: string): Element | null {
    const words = command.split(' ');
    const searchText = words.slice(1).join(' '); // Remove action word

    // Search for buttons, links, and other interactive elements
    const selectors = 'button, a, input, select, textarea, [role="button"], [role="link"]';
    const elements = document.querySelectorAll(selectors);

    for (const element of elements) {
      const text = element.textContent?.toLowerCase() || '';
      if (text.includes(searchText)) {
        return element;
      }
    }

    return null;
  }

  private handleKeyboardShortcut(event: KeyboardEvent): void {
    const key = [];
    
    if (event.ctrlKey) key.push('Ctrl');
    if (event.altKey) key.push('Alt');
    if (event.shiftKey) key.push('Shift');
    if (event.metaKey) key.push('Meta');
    
    key.push(event.key);
    
    const shortcut = key.join('+');
    const action = this.shortcuts.get(shortcut);
    
    if (action) {
      event.preventDefault();
      action();
    }
  }

  private skipToMainContent(): void {
    const main = document.querySelector('main, [role="main"], #main');
    if (main) {
      (main as HTMLElement).focus();
      this.announce('Skipped to main content', 'polite');
    }
  }

  private skipToNavigation(): void {
    const nav = document.querySelector('nav, [role="navigation"], #navigation');
    if (nav) {
      (nav as HTMLElement).focus();
      this.announce('Skipped to navigation', 'polite');
    }
  }

  private skipToSearch(): void {
    const search = document.querySelector('input[type="search"], [role="search"]');
    if (search) {
      (search as HTMLElement).focus();
      this.announce('Skipped to search', 'polite');
    }
  }

  private toggleHighContrast(): void {
    const root = document.documentElement;
    const isEnabled = root.classList.toggle('high-contrast');
    this.announce(`High contrast ${isEnabled ? 'enabled' : 'disabled'}`, 'polite');
  }

  private toggleLargeText(): void {
    const root = document.documentElement;
    const isEnabled = root.classList.toggle('large-text');
    this.announce(`Large text ${isEnabled ? 'enabled' : 'disabled'}`, 'polite');
  }

  private toggleScreenReader(): void {
    const root = document.documentElement;
    const isEnabled = root.classList.toggle('screen-reader-optimized');
    this.announce(`Screen reader optimization ${isEnabled ? 'enabled' : 'disabled'}`, 'polite');
  }

  private toggleVoiceInput(): void {
    if (this.isListening) {
      this.stopVoiceInput();
    } else {
      this.startVoiceInput();
    }
  }

  private showKeyboardHelp(): void {
    const helpText = `
      Keyboard shortcuts:
      Alt+1: Skip to main content
      Alt+2: Skip to navigation
      Alt+3: Skip to search
      Alt+H: Toggle high contrast
      Alt+L: Toggle large text
      Alt+R: Toggle screen reader mode
      Alt+V: Toggle voice input
      Ctrl+/: Show this help
      Escape: Dismiss overlays
    `;
    
    this.announce(helpText, 'polite');
  }

  private showVoiceHelp(): void {
    const helpText = `
      Voice commands:
      Say "scroll up" or "scroll down" to navigate
      Say "go to top" or "go to bottom" to jump
      Say "click" followed by button text to activate
      Say "help" for this message
      Say "stop listening" to disable voice input
    `;
    
    this.announce(helpText, 'polite');
  }

  private dismissOverlays(): void {
    // Close any open modals or overlays
    const overlays = document.querySelectorAll('[role="dialog"], .modal, .overlay');
    overlays.forEach(overlay => {
      const closeButton = overlay.querySelector('[data-dismiss], .close, .cancel');
      if (closeButton) {
        (closeButton as HTMLElement).click();
      }
    });
  }

  private updateSystemPreferences(key: string, value: boolean): void {
    // Update preferences based on system settings
    console.log(`System preference ${key} changed to ${value}`);
  }

  async performAccessibilityAudit(): Promise<AccessibilityError[]> {
    const errors: AccessibilityError[] = [];

    if (typeof document === 'undefined') return errors;

    // Check for missing alt text
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.alt) {
        errors.push({
          type: 'missing_alt_text',
          severity: 'high',
          description: 'Image missing alt text',
          element: `img[${index}]`,
          wcagLevel: 'A',
          suggestion: 'Add descriptive alt text to all images'
        });
      }
    });

    // Check for missing form labels
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((input, index) => {
      const id = input.id;
      const label = id ? document.querySelector(`label[for="${id}"]`) : null;
      if (!label && !input.getAttribute('aria-label')) {
        errors.push({
          type: 'missing_label',
          severity: 'high',
          description: 'Form element missing label',
          element: `${input.tagName.toLowerCase()}[${index}]`,
          wcagLevel: 'A',
          suggestion: 'Add label or aria-label to form elements'
        });
      }
    });

    // Check for insufficient color contrast
    const elements = document.querySelectorAll('*');
    elements.forEach((element, index) => {
      const styles = window.getComputedStyle(element);
      const backgroundColor = styles.backgroundColor;
      const color = styles.color;
      
      if (backgroundColor !== 'rgba(0, 0, 0, 0)' && color !== 'rgba(0, 0, 0, 0)') {
        const contrast = this.calculateContrastRatio(backgroundColor, color);
        if (contrast < 4.5) {
          errors.push({
            type: 'low_contrast',
            severity: 'medium',
            description: `Low color contrast ratio: ${contrast.toFixed(2)}`,
            element: `${element.tagName.toLowerCase()}[${index}]`,
            wcagLevel: 'AA',
            suggestion: 'Increase color contrast to at least 4.5:1'
          });
        }
      }
    });

    // Check for missing headings structure
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      errors.push({
        type: 'missing_headings',
        severity: 'medium',
        description: 'No heading structure found',
        wcagLevel: 'AA',
        suggestion: 'Add proper heading structure for page organization'
      });
    }

    // Check for keyboard accessibility
    const focusableElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
    focusableElements.forEach((element, index) => {
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex && parseInt(tabIndex) > 0) {
        errors.push({
          type: 'positive_tabindex',
          severity: 'medium',
          description: 'Positive tabindex found',
          element: `${element.tagName.toLowerCase()}[${index}]`,
          wcagLevel: 'A',
          suggestion: 'Avoid positive tabindex values'
        });
      }
    });

    return errors;
  }

  private calculateContrastRatio(bg: string, fg: string): number {
    // Simplified contrast calculation
    // In production, this would use proper color parsing and WCAG contrast formula
    return Math.random() * 10 + 1; // Mock implementation
  }

  getAccessibilityReport(): {
    errors: AccessibilityError[];
    score: number;
    recommendations: string[];
  } {
    // This would typically run the audit
    const errors: AccessibilityError[] = [];
    const score = 85; // Mock score
    const recommendations = [
      'Add alt text to all images',
      'Improve color contrast ratios',
      'Add proper heading structure',
      'Ensure keyboard navigation works',
      'Add ARIA labels where needed'
    ];

    return { errors, score, recommendations };
  }
}

export const accessibilityService = new AccessibilityService();