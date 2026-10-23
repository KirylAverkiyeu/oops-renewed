import React, { useState, useEffect, useMemo } from 'react';
import { 
  Subscription, 
  KpiStats, 
  HealthCheckResponse, 
  BillingCycle, 
  Category, 
  Currency, 
  CURRENCIES 
} from '../types';
import { Navbar } from './components/Navbar';
import { KpiCards } from './components/KpiCards';
import { FilterBar } from './components/FilterBar';
import { SubscriptionTable } from './components/SubscriptionTable';
import { SubscriptionModal, SubscriptionFormData } from './components/SubscriptionModal';
import { Toast } from './components/Toast';
import { Footer } from './components/Footer';

const CATEGORIES: Category[] = [
  'Entertainment',
  'Infrastructure',
  'Utilities',
  'Insurance',
  'Trial',
  'Other'
];

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  });

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<KpiStats | null>(null);
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  
  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [sortBy, setSortBy] = useState<'days' | 'amount' | 'name'>('days');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [schedulerTriggering, setSchedulerTriggering] = useState(false);

  // Form State
  const [formData, setFormData] = useState<SubscriptionFormData>({
    name: '',
    amount: 49.99,
    currency: 'PLN',
    billing_cycle: 'monthly',
    custom_cycle_days: 30,
    next_renewal_date: new Date().toISOString().split('T')[0],
    remind_days_before: 2,
    category: 'Entertainment',
    is_trial: false,
    cancel_url: '',
    notes: '',
    active: true
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    try {
      const [subsRes, statsRes, healthRes] = await Promise.all([
        fetch('/api/subscriptions'),
        fetch('/api/stats'),
        fetch('/api/health')
      ]);

      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setSubscriptions(subsData);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      showToast('Could not reach Oops, Renewed! API', 'error');
    }
  };

  useEffect(() => {
    fetchData();
    const AUTO_REFRESH_INTERVAL_MS = 3 * 60 * 1000;
    const interval = setInterval(fetchData, AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);

    // Sync theme-color meta tag for mobile browsers
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#020617' : '#f8fafc');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Helper date calculations
  const calculateDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d, 0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  };

  const calculateNormalized = (amount: number, cycle: BillingCycle, customDays?: number | null) => {
    if (amount <= 0) return 0;
    switch (cycle) {
      case 'monthly': return amount;
      case 'quarterly': return amount / 3;
      case 'yearly': return amount / 12;
      case 'custom_days': return amount * (30.4375 / (customDays || 30));
      default: return amount;
    }
  };

  // Open modal for Add or Edit
  const handleOpenAdd = () => {
    setEditingSub(null);
    const todayStr = new Date().toISOString().split('T')[0];
    setFormData({
      name: '',
      amount: 49.99,
      currency: stats?.primaryCurrency || 'PLN',
      billing_cycle: 'monthly',
      custom_cycle_days: 30,
      next_renewal_date: todayStr,
      remind_days_before: 2,
      category: 'Entertainment',
      is_trial: false,
      cancel_url: '',
      notes: '',
      active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setFormData({
      name: sub.name,
      amount: sub.amount,
      currency: sub.currency,
      billing_cycle: sub.billing_cycle,
      custom_cycle_days: sub.custom_cycle_days || 30,
      next_renewal_date: sub.next_renewal_date,
      remind_days_before: sub.remind_days_before,
      category: sub.category,
      is_trial: sub.is_trial,
      cancel_url: sub.cancel_url || '',
      notes: sub.notes || '',
      active: sub.active
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        custom_cycle_days: formData.billing_cycle === 'custom_days' ? Number(formData.custom_cycle_days) : null,
        remind_days_before: Number(formData.remind_days_before),
        is_trial: formData.is_trial ? 1 : 0,
        active: formData.active ? 1 : 0,
        cancel_url: formData.cancel_url ? formData.cancel_url.trim() : null,
        notes: formData.notes ? formData.notes.trim() : null,
      };

      if (editingSub) {
        const res = await fetch(`/api/subscriptions/${editingSub.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Update failed');
        showToast(`Updated "${formData.name}" successfully`);
      } else {
        const res = await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Creation failed');
        showToast(`Added "${formData.name}" to tracker`);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  // Quick Action: Advance / Roll to Next Cycle
  const handleRollCycle = async (sub: Subscription) => {
    setActionLoadingId(sub.id);
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}/rollover`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to roll over cycle');
      const updated = await res.json();
      showToast(`Rolled "${sub.name}" forward to ${updated.next_renewal_date}`);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Could not roll cycle', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Action: Test Telegram Alert
  const handleTestAlert = async (sub: Subscription) => {
    setActionLoadingId(sub.id);
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}/test-alert`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Alert delivery failed');
      showToast(`⚡ Test Telegram alert dispatched for "${sub.name}"!`);
    } catch (err: any) {
      showToast(err.message || 'Telegram alert failed. Verify bot configuration.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Action: Toggle Active / Archive
  const handleToggleArchive = async (sub: Subscription) => {
    setActionLoadingId(sub.id);
    try {
      const newActive = !sub.active;
      const res = await fetch(`/api/subscriptions/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActive })
      });
      if (!res.ok) throw new Error('Status update failed');
      showToast(newActive ? `Restored "${sub.name}"` : `Archived "${sub.name}"`);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Action: Delete
  const handleDelete = async (sub: Subscription) => {
    if (!confirm(`Are you sure you want to permanently delete "${sub.name}"?`)) return;
    setActionLoadingId(sub.id);
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Deletion failed');
      showToast(`Deleted "${sub.name}"`, 'info');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete subscription', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Trigger manual scheduler run
  const handleTriggerScheduler = async () => {
    setSchedulerTriggering(true);
    try {
      const res = await fetch('/api/scheduler/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check failed');
      showToast(`Scheduler check complete! Rolled: ${data.autoRolledCount}, Alerts: ${data.alertsSentCount}`);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to run scheduler check', 'error');
    } finally {
      setSchedulerTriggering(false);
    }
  };

  // Filtered & Sorted Subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions
      .filter((item) => {
        if (statusFilter === 'active' && !item.active) return false;
        if (statusFilter === 'archived' && item.active) return false;
        if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchNotes = item.notes?.toLowerCase().includes(q) ?? false;
          if (!matchName && !matchNotes) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'days') {
          if (a.active !== b.active) return (b.active ? 1 : 0) - (a.active ? 1 : 0);
          return calculateDaysUntil(a.next_renewal_date) - calculateDaysUntil(b.next_renewal_date);
        }
        if (sortBy === 'amount') {
          return b.amount - a.amount;
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [subscriptions, statusFilter, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <Navbar
        health={health}
        schedulerTriggering={schedulerTriggering}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onTriggerScheduler={handleTriggerScheduler}
        onOpenAdd={handleOpenAdd}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <KpiCards stats={stats} />

        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          categories={CATEGORIES}
        />

        <SubscriptionTable
          subscriptions={filteredSubscriptions}
          actionLoadingId={actionLoadingId}
          onTestAlert={handleTestAlert}
          onRollCycle={handleRollCycle}
          onEdit={handleOpenEdit}
          onToggleArchive={handleToggleArchive}
          onDelete={handleDelete}
          onOpenAdd={handleOpenAdd}
          calculateDaysUntil={calculateDaysUntil}
          calculateNormalized={calculateNormalized}
        />
      </main>

      <SubscriptionModal
        isOpen={isModalOpen}
        editingSub={editingSub}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmitForm}
        onClose={() => setIsModalOpen(false)}
        categories={CATEGORIES}
        currencies={CURRENCIES}
      />

      <Footer />
    </div>
  );
}
