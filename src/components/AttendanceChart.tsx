"use client";
import Image from "next/image";
import { useEffect } from "react";
import {
  BarChart,
  Bar,
  Rectangle,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AttendanceChartProps {
  data?: { name: string; present: number; absent: number }[];
}

 
const AttendanceChart = ({
  data,
}: {
  data: { name: string; present: number; absent: number }[];
}) => {

  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      // Hii inaficha tu onyo la recharts la defaultProps ambalo halina madhara
      if (typeof args[0] === 'string' && args[0].includes("defaultProps")) return;
      originalError(...args);
    };
    return () => {
      console.error = originalError; // Rudisha console asili component ikifungwa
    };
  }, []);
 
  return (
    <ResponsiveContainer width="100%" height="90%">
      <BarChart width={500} height={300} data={data} barSize={20}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2401ee" />
        <XAxis
          dataKey="name"
          axisLine={false}
          tick={{ fill: "#0864ee" }}
          tickLine={false}
        />
        <YAxis axisLine={false} tick={{ fill: "#0716ec" }} tickLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }}
        />
        <Legend
          align="left"
          verticalAlign="top"
          wrapperStyle={{ paddingTop: "20px", paddingBottom: "40px" }}
        />
        <Bar
          dataKey="present"
          fill="#05e217"
          legendType="circle"
          radius={[10, 10, 0, 0]}
        />
        <Bar
          dataKey="absent"
          fill="#0ea9e2"
          legendType="circle"
          radius={[10, 10, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default AttendanceChart;
