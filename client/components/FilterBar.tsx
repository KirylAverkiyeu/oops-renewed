import React from 'react';
import { Search, X, Layers, Filter } from 'lucide-react';
import { Category } from '../../types';

export interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  statusFilter: 'active' | 'archived' | 'all';
  onStatusFilterChange: (status: 'active' | 'archived' | 'all') => void;
  sortBy: 'days' | 'amount' | 'name';
  onSortByChange: (sort: 'days' | 'amount' | 'name') => void;
  categories: Category[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  categories,
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/60 border border-slate-800/80">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search subscriptions, trials, notes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-9 py-2 text-base sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        {/* Status Filter Tabs (Segmented control) */}
        <div className="grid grid-cols-3 sm:flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => onStatusFilterChange('active')}
            className={`py-1.5 sm:py-1 px-3 rounded-lg transition-colors font-medium text-center ${
              statusFilter === 'active'
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => onStatusFilterChange('archived')}
            className={`py-1.5 sm:py-1 px-3 rounded-lg transition-colors font-medium text-center ${
              statusFilter === 'archived'
                ? 'bg-slate-800 text-slate-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Archived
          </button>
          <button
            onClick={() => onStatusFilterChange('all')}
            className={`py-1.5 sm:py-1 px-3 rounded-lg transition-colors font-medium text-center ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-slate-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
        </div>

        {/* Dropdowns Row on Mobile */}
        <div className="grid grid-cols-2 sm:flex items-center gap-2">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 w-full sm:w-auto overflow-hidden">
            <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="bg-transparent border-none text-slate-200 text-xs focus:outline-none cursor-pointer w-full truncate"
            >
              <option value="All" className="bg-slate-900">
                All Categories
              </option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 w-full sm:w-auto overflow-hidden">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as any)}
              className="bg-transparent border-none text-slate-200 text-xs focus:outline-none cursor-pointer w-full truncate"
            >
              <option value="days" className="bg-slate-900">
                Sort: Renewal
              </option>
              <option value="amount" className="bg-slate-900">
                Sort: Amount
              </option>
              <option value="name" className="bg-slate-900">
                Sort: Name
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
