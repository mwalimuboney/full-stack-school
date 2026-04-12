import Announcements from "@/components/Announcements";
import AttendanceChartContainer from "@/components/AttendanceChartContainer";
import CountChartContainer from "@/components/CountChartContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import FinanceChart from "@/components/FinanceChart";
import UserCard from "@/components/UserCard";
import { Suspense } from "react";

// Production Tip: Create reusable skeleton loaders to prevent layout shift
const CardSkeleton = () => (
  <div className="flex-1 min-w-[130px] h-[100px] bg-white animate-pulse rounded-2xl p-4 shadow-sm border border-gray-100" />
);

const ChartSkeleton = () => (
  <div className="w-full h-full bg-white animate-pulse rounded-2xl shadow-sm border border-gray-100" />
);

const AdminPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  // Await searchParams if using Next.js 15
  const params = await searchParams;

  return (
    <div className="p-4 flex gap-4 flex-col md:flex-row">
      {/* LEFT SECTION */}
      <div className="w-full lg:w-2/3 flex flex-col gap-8">
        
        {/* USER CARDS: Wrapped in individual Suspense to load in parallel */}
        <div className="flex gap-4 justify-between flex-wrap">
          <Suspense fallback={<CardSkeleton />}>
            <UserCard type="admin" />
          </Suspense>
          <Suspense fallback={<CardSkeleton />}>
            <UserCard type="teacher" />
          </Suspense>
          <Suspense fallback={<CardSkeleton />}>
            <UserCard type="student" />
          </Suspense>
          <Suspense fallback={<CardSkeleton />}>
            <UserCard type="parent" />
          </Suspense>
        </div>

        {/* MIDDLE CHARTS: Heavy DB logic inside Containers */}
        <div className="flex gap-4 flex-col lg:flex-row">
          <div className="w-full lg:w-1/3 h-[450px]">
            <Suspense fallback={<ChartSkeleton />}>
              <CountChartContainer />
            </Suspense>
          </div>
          <div className="w-full lg:w-2/3 h-[450px]">
            <Suspense fallback={<ChartSkeleton />}>
              <AttendanceChartContainer />
            </Suspense>
          </div>
        </div>

        {/* BOTTOM CHART: Client-side rendering usually handles its own loading */}
        <div className="w-full h-[500px]">
          <FinanceChart />
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="w-full lg:w-1/3 flex flex-col gap-8">
        <Suspense fallback={<ChartSkeleton />}>
          <EventCalendarContainer searchParams={params} />
        </Suspense>
        <Announcements />
      </div>
    </div>
  );
};

export default AdminPage;