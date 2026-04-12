export default function Loading() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-lamaSkyLight gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600" />
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  );
}