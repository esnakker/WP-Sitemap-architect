import React, { useState, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { PageComment, Actor } from '../types';
import { supabaseService } from '../services/supabaseService';
import { formatRelativeTime } from '../utils/activityUtils';

interface CommentsSectionProps {
  projectId: string;
  pageId: string;
  actor: Actor;
  shareToken?: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  projectId,
  pageId,
  actor,
  shareToken,
}) => {
  const [comments, setComments] = useState<PageComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadComments();
  }, [projectId, pageId]);

  const loadComments = async () => {
    try {
      const data = await supabaseService.getComments(projectId, pageId);
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || sending) return;

    setSending(true);
    try {
      if (shareToken && actor.is_guest) {
        await supabaseService.addGuestComment(shareToken, actor.name, pageId, newComment.trim());
      } else {
        await supabaseService.addComment(projectId, pageId, actor, newComment.trim());
        await supabaseService.logActivity(projectId, 'comment_added', actor, pageId);
      }
      setNewComment('');
      await loadComments();
    } catch (err) {
      console.error('Failed to add comment:', err);
      alert('Failed to add comment');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare size={14} className="text-slate-500" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Comments ({comments.length})
        </span>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {loading ? (
          <div className="text-xs text-slate-500 text-center py-4">Loading...</div>
        ) : comments.length === 0 ? (
          <div className="text-xs text-slate-400 italic text-center py-4">
            No comments yet
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-slate-50 rounded p-2 border border-slate-100">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-slate-700">
                  {comment.author_name}
                  {comment.author_is_guest && (
                    <span className="ml-1 text-[10px] text-slate-400">(Guest)</span>
                  )}
                </span>
                <span className="text-[10px] text-slate-400">
                  {formatRelativeTime(comment.created_at)}
                </span>
              </div>
              <p className="text-xs text-slate-600 whitespace-pre-wrap">{comment.body}</p>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
          placeholder="Add a comment..."
          className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          disabled={sending}
        />
        <button
          onClick={handleAddComment}
          disabled={!newComment.trim() || sending}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  );
};
