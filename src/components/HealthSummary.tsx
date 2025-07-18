'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  HeartIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { User, HealthRecord, VitalSign } from '@/types';
import { dbService } from '@/lib/supabase';

interface HealthSummaryProps {
  user: User;
  healthData: HealthRecord | null;
}

export default function HealthSummary({ user, healthData }: HealthSummaryProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [localHealthData, setLocalHealthData] = useState<HealthRecord | null>(healthData);

  useEffect(() => {
    setLocalHealthData(healthData);
  }, [healthData]);

  const refreshHealthData = async () => {
    if (user.role !== 'user') return;
    
    setIsLoading(true);
    try {
      const data = await dbService.getHealthData(user.id);
      setLocalHealthData(data);
    } catch (error) {
      console.error('Error refreshing health data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getVitalStatus = (vital: string, value: number) => {
    const ranges = {
      heartRate: { min: 60, max: 100 },
      bloodPressureSystolic: { min: 90, max: 140 },
      bloodPressureDiastolic: { min: 60, max: 90 },
      temperature: { min: 36.1, max: 37.2 },
      oxygenSaturation: { min: 95, max: 100 }
    };

    const range = ranges[vital as keyof typeof ranges];
    if (!range) return 'normal';

    if (value < range.min || value > range.max) return 'warning';
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'critical':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  if (user.role !== 'user') {
    return (
      <div className="card">
        <div className="text-center py-8">
          <HeartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Health Summary</h3>
          <p className="text-gray-600">
            Health records are only available for patient accounts
          </p>
        </div>
      </div>
    );
  }

  if (!localHealthData) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <HeartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Health Summary</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No health data available
          </p>
          <button
            onClick={refreshHealthData}
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>
    );
  }

  // Get the latest vital signs
  const latestVitals: VitalSign = localHealthData.vital_signs?.[0] || {} as VitalSign;
  const medications = localHealthData.medications || [];
  const appointments = localHealthData.appointments || [];
  const labResults = localHealthData.lab_results || [];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <HeartIcon className="h-6 w-6 text-red-500 mr-2" />
          Health Summary
        </h2>
        <button
          onClick={refreshHealthData}
          disabled={isLoading}
          className="btn-secondary text-sm"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Patient Info */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{user.name}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Email:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{user.email}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Role:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100 capitalize">{user.role}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Facility:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{user.facility || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Department:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{user.department || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Vital Signs */}
      {latestVitals && Object.keys(latestVitals).length > 1 ? (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Latest Vitals</h3>
          <div className="grid grid-cols-1 gap-3">
            {/* Heart Rate */}
            {latestVitals.heart_rate && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Heart Rate</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{latestVitals.heart_rate}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor('normal')}`}>
                    Normal
                  </span>
                </div>
              </div>
            )}

            {/* Blood Pressure */}
            {latestVitals.blood_pressure && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Blood Pressure</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{latestVitals.blood_pressure}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor('normal')}`}>
                    Normal
                  </span>
                </div>
              </div>
            )}

            {/* Temperature */}
            {latestVitals.temperature && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Temperature</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{latestVitals.temperature}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor('normal')}`}>
                    Normal
                  </span>
                </div>
              </div>
            )}

            {/* Weight */}
            {latestVitals.weight && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Weight</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{latestVitals.weight}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor('normal')}`}>
                    Normal
                  </span>
                </div>
              </div>
            )}

            {/* Date */}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Recorded: {new Date(latestVitals.date).toLocaleDateString()}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Vital Signs</h3>
          <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <HeartIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No vital signs recorded</p>
          </div>
        </div>
      )}

      {/* Recent Lab Results */}
      {labResults.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Recent Lab Results</h3>
          <div className="space-y-2">
            {labResults.slice(0, 3).map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center">
                  <DocumentTextIcon className="h-4 w-4 text-blue-500 mr-3" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{result.test_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{result.value}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.status.includes('Normal') || result.status.includes('✅') ? 
                    'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900' :
                    'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900'
                  }`}>
                    {result.status.replace('✅ ', '').replace('⚠️ ', '')}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(result.test_date).toLocaleDateString()}
                  </span>
                </div>
              </motion.div>
            ))}
            {labResults.length > 3 && (
              <div className="text-center pt-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  +{labResults.length - 3} more results
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Medications */}
      {medications.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Current Medications</h3>
          <div className="space-y-2">
            {medications.slice(0, 3).map((medication, index) => (
              <div key={medication.id || index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{medication.name}</span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{medication.dosage}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{medication.frequency}</span>
                  {medication.prescribed_date && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Prescribed: {new Date(medication.prescribed_date).toLocaleDateString()}
                    </p>
                  )}
                  {medication.prescriber && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      By: {medication.prescriber}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {medications.length > 3 && (
              <div className="text-center pt-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  +{medications.length - 3} more medications
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Appointments */}
      {appointments.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Upcoming Appointments</h3>
          <div className="space-y-2">
            {appointments.slice(0, 2).map((appointment, index) => (
              <div key={appointment.id || index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{appointment.appointment_type}</span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {appointment.reason || 'General consultation'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(appointment.appointment_date).toLocaleDateString()}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {appointment.provider_name}
                  </p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                    appointment.status === 'Scheduled' ?
                    'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900' :
                    'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-600'
                  }`}>
                    {appointment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <CalendarDaysIcon className="h-4 w-4 mr-2" />
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </div>
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <DocumentTextIcon className="h-4 w-4 mr-2" />
          <span>{medications.length} medications, {labResults.length} lab results</span>
        </div>
      </div>
    </div>
  );
}