"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

const TableSort = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams);
    const currentOrder = params.get("order") === "asc" ? "desc" : "asc";
    params.set("sort", field);
    params.set("order", currentOrder);
    router.push(`?${params.toString()}`);
  };

  return (
    <button 
      onClick={() => handleSort("name")} // For now, sorting by name
      className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow"
    >
      <Image src="/sort.png" alt="" width={14} height={14} />
    </button>
  );
};

export default TableSort;