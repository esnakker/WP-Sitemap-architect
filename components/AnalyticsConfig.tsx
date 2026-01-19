import React, { useState, useEffect } from 'react';
import { X, Upload, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { analyticsService } from '../services/analyticsService';
import { AnalyticsCredentials, SitePage } from '../types';

interface Props {
  projectId: string;
  pages: SitePage[];
  onClose: () => void;
  onSyncComplete: () => void;
}

export const AnalyticsConfig: React.FC<Props> = ({ projectId, pages, onClose, onSyncComplete }) => {
  const [propertyId, setPropertyId] = useState('');
  const [credentialsFile, setCredentialsFile] = useState<File | null>(null);
  const [existingCredentials, setExistingCredentials] = useState<AnalyticsCredentials | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<string>('');

  useEffect(() => {
    loadCredentials();
  }, [projectId]);

  const loadCredentials = async () => {
    try {
      const creds = await supabaseService.getAnalyticsCredentials(projectId);
      if (creds) {
        setExistingCredentials(creds);
        setPropertyId(creds.property_id);
      }
    } catch (err: any) {
      console.error('Failed to load credentials:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCredentialsFile(file);
      setTestResult(null);
      setError(null);
    }
  };

  const handleTestConnection = async () => {
    if (!propertyId || (!credentialsFile && !existingCredentials)) {
      setError('Bitte Property ID und Credentials angeben');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      let credentialsJson;

      if (credentialsFile) {
        const fileContent = await credentialsFile.text();
        credentialsJson = JSON.parse(fileContent);
      } else if (existingCredentials) {
        credentialsJson = existingCredentials.credentials_json;
      }

      const isValid = await analyticsService.testConnection({
        property_id: propertyId,
        credentials_json: credentialsJson,
      });

      if (isValid) {
        setTestResult('success');
        if (credentialsFile) {
          await supabaseService.saveAnalyticsCredentials(
            projectId,
            propertyId,
            credentialsJson
          );
          await loadCredentials();
        }
      } else {
        setTestResult('error');
        setError('Verbindung fehlgeschlagen. Bitte Credentials überprüfen.');
      }
    } catch (err: any) {
      setTestResult('error');
      setError(err.message || 'Unbekannter Fehler');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async () => {
    if (!existingCredentials) {
      setError('Bitte erst Verbindung testen und speichern');
      return;
    }

    setIsSyncing(true);
    setError(null);
    setSyncProgress('Starte Synchronisation...');

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 84);

      const pageUrls = pages.map(p => p.url);
      setSyncProgress(`Lade Daten für ${pageUrls.length} Seiten...`);

      const analyticsData = await analyticsService.fetchPageAnalytics(
        {
          property_id: existingCredentials.property_id,
          credentials_json: existingCredentials.credentials_json,
        },
        pageUrls,
        startDate,
        endDate
      );

      setSyncProgress('Speichere Daten in Datenbank...');

      const allAnalytics: any[] = [];
      analyticsData.forEach((weeklyData, url) => {
        const page = pages.find(p => p.url === url);
        if (page) {
          weeklyData.forEach(week => {
            allAnalytics.push({
              ...week,
              project_id: projectId,
              page_id: page.id,
            });
          });
        }
      });

      await supabaseService.savePageAnalytics(allAnalytics);
      await supabaseService.updateAnalyticsLastSync(projectId);

      setSyncProgress('Synchronisation abgeschlossen!');
      setTimeout(() => {
        onSyncComplete();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Sync failed:', err);
      setError(err.message || 'Synchronisation fehlgeschlagen');
      setSyncProgress('');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Analytics-Konfiguration wirklich löschen?')) return;

    try {
      await supabaseService.deleteAnalyticsCredentials(projectId);
      await supabaseService.deletePageAnalytics(projectId);
      setExistingCredentials(null);
      setPropertyId('');
      setCredentialsFile(null);
      setTestResult(null);
    } catch (err: any) {
      setError(err.message || 'Löschen fehlgeschlagen');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Google Analytics 4 Konfiguration</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Setup-Anleitung:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Google Cloud Console öffnen und Service Account erstellen</li>
              <li>Google Analytics Data API aktivieren</li>
              <li>Service Account JSON-Key herunterladen</li>
              <li>Service Account E-Mail in GA4 als Leser hinzufügen</li>
              <li>Property ID aus GA4 kopieren</li>
            </ol>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                GA4 Property ID
              </label>
              <input
                type="text"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                placeholder="123456789"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Service Account Credentials (JSON)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                  id="credentials-file"
                />
                <label
                  htmlFor="credentials-file"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <Upload size={20} className="text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {credentialsFile ? credentialsFile.name : 'JSON-Datei hochladen'}
                  </span>
                </label>
              </div>
              {existingCredentials && !credentialsFile && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle size={14} />
                  Credentials bereits konfiguriert
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {testResult === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">Verbindung erfolgreich! Jetzt synchronisieren.</p>
            </div>
          )}

          {syncProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Loader2 size={18} className="text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
              <p className="text-sm text-blue-800">{syncProgress}</p>
            </div>
          )}

          {existingCredentials?.last_sync_at && (
            <p className="text-xs text-slate-500">
              Letzte Synchronisation:{' '}
              {new Date(existingCredentials.last_sync_at).toLocaleString('de-DE')}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || isSyncing || !propertyId}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Teste...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Verbindung testen
                </>
              )}
            </button>

            <button
              onClick={handleSync}
              disabled={!existingCredentials || isSyncing || isTesting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSyncing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Synchronisiere...
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Daten synchronisieren
                </>
              )}
            </button>
          </div>

          {existingCredentials && (
            <button
              onClick={handleDelete}
              disabled={isSyncing}
              className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            >
              Konfiguration löschen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
