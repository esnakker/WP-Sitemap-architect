import React from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { PageStatus, ProjectOwner } from '../types';
import clsx from 'clsx';

interface FilterSettings {
  statuses: PageStatus[];
  ownerIds: string[];
  hideFiltered: boolean;
}

interface Props {
  filters: FilterSettings;
  owners: ProjectOwner[];
  onFiltersChange: (filters: FilterSettings) => void;
  onClose: () => void;
}

const statusOptions: { value: PageStatus; label: string; color: string }[] = [
  { value: 'neutral', label: 'Neutral', color: 'bg-slate-100 text-slate-700' },
  { value: 'move', label: 'Move', color: 'bg-orange-100 text-orange-700' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
  { value: 'archived', label: 'Archived', color: 'bg-slate-100 text-slate-700' },
  { value: 'redirect', label: 'Redirect', color: 'bg-blue-100 text-blue-700' },
  { value: 'new', label: 'New', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'remove', label: 'Remove', color: 'bg-red-100 text-red-700' },
  { value: 'update', label: 'Update', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'merge', label: 'Merge', color: 'bg-amber-100 text-amber-700' },
];

export const FilterPanel: React.FC<Props> = ({ filters, owners, onFiltersChange, onClose }) => {
  const toggleStatus = (status: PageStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const toggleOwner = (ownerId: string) => {
    const newOwnerIds = filters.ownerIds.includes(ownerId)
      ? filters.ownerIds.filter(id => id !== ownerId)
      : [...filters.ownerIds, ownerId];
    onFiltersChange({ ...filters, ownerIds: newOwnerIds });
  };

  const toggleHideFiltered = () => {
    onFiltersChange({ ...filters, hideFiltered: !filters.hideFiltered });
  };

  const clearAllFilters = () => {
    onFiltersChange({ statuses: [], ownerIds: [], hideFiltered: filters.hideFiltered });
  };

  const activeFilterCount = filters.statuses.length + filters.ownerIds.length;

  return (
    <div className="fixed right-6 top-20 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in slide-in-from-right fade-in duration-300">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Filter</h3>
          {activeFilterCount > 0 && (
            <span className="text-xs text-slate-500">{activeFilterCount} active</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-200 rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Display Mode */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
            Display Mode
          </label>
          <button
            onClick={toggleHideFiltered}
            className={clsx(
              "w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2",
              filters.hideFiltered
                ? "bg-slate-100 border-slate-300 text-slate-700"
                : "bg-blue-50 border-blue-300 text-blue-700"
            )}
          >
            {filters.hideFiltered ? (
              <>
                <EyeOff size={16} />
                Hide Filtered
              </>
            ) : (
              <>
                <Eye size={16} />
                Gray Out Filtered
              </>
            )}
          </button>
          <p className="text-[10px] text-slate-500 mt-1">
            {filters.hideFiltered
              ? 'Filtered items will be completely hidden'
              : 'Filtered items will be grayed out but visible'}
          </p>
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
            Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {statusOptions.map((option) => {
              const isActive = filters.statuses.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleStatus(option.value)}
                  className={clsx(
                    "px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                    isActive
                      ? `${option.color} border-current shadow-sm`
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Owner Filter */}
        {owners.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              Business Unit / Owner
            </label>
            <div className="space-y-2">
              {owners.map((owner) => {
                const isActive = filters.ownerIds.includes(owner.id);
                return (
                  <button
                    key={owner.id}
                    onClick={() => toggleOwner(owner.id)}
                    className={clsx(
                      "w-full px-3 py-2 rounded-lg text-sm font-medium transition-all border flex items-center gap-2",
                      isActive
                        ? "bg-blue-50 border-blue-300 text-blue-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {owner.color && (
                      <div
                        className="w-3 h-3 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: owner.color }}
                      />
                    )}
                    {owner.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  );
};
