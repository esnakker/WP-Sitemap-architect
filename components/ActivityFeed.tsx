import React, { useState, useEffect } from 'react';
import { X, Activity } from 'lucide-react';
import { ActivityLog, SitePage } from '../types';
import { supabaseService } from '../services/supabaseService';
import { formatActivityMessage, formatRelativeTime } from '../utils/activityUtils';

interface ActivityFeedProps {
  projectId: string;
  pages: SitePage[];
  onClose: () => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ projectId, pages, onClose }) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, [projectId]);

  const loadActivity = async () => {
    try {
      const data = await supabaseService.getActivityFeed(projectId, 50);
      setActivities(data);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed right-6 top-20 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-40 animate-in slide-in-from-right fade-in duration-300 flex flex-col max-h-[85vh]">
      <div className="flex items-center justify-between p-4 border-b bg-slate-50">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Activity Feed</h2>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-slate-400 italic">No activity yet</div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="text-xs text-slate-600">
                      <span className="font-medium text-slate-900">{activity.actor_name}</span>
                      {activity.actor_is_guest && (
                        <span className="ml-1 text-[10px] text-slate-400">(Guest)</span>
                      )}
                      {' '}
                      {formatActivityMessage(activity, pages)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {formatRelativeTime(activity.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
