import { UserProfile } from "@clerk/nextjs";

const SettingsPage = () => {
  return (
    <div className="p-4 flex flex-col gap-8">
      <h1 className="text-xl font-semibold">Account Settings</h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* LEFT: GENERAL SETTINGS */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-100">
            <h2 className="font-medium mb-4">Preferences</h2>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Email Notifications</span>
                <input type="checkbox" className="w-4 h-4 accent-lamaPurple" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Dark Mode</span>
                <input type="checkbox" className="w-4 h-4 accent-lamaPurple" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Public Profile</span>
                <input type="checkbox" className="w-4 h-4 accent-lamaPurple" defaultChecked />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: CLERK USER MANAGEMENT */}
        <div className="w-full lg:w-2/3 bg-white p-4 rounded-md shadow-sm border border-gray-100">
          <h2 className="font-medium mb-4">Security & Identity</h2>
          <p className="text-xs text-gray-500 mb-6">
            Manage your authentication methods and security settings through our identity provider.
          </p>
          {/* Clerk's built-in profile component handles password resets and MFA */}
          <div className="scale-95 origin-top-left">
             <UserProfile routing="hash" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;