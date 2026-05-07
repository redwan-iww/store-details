'use client';

import dynamic from 'next/dynamic';
import TimelineMilestones from '@/components/TimelineMilestones';
import ResourceCapacity from '@/components/ResourceCapacity';

const ChurnMetrics = dynamic(() => import('@/components/ChurnMetrics'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  ),
});

export default function Home() {
  return (
    <div className="space-y-6">
      <ChurnMetrics />
      <TimelineMilestones />
      <ResourceCapacity />
    </div>
  );
}
