import { Outlet, Navigate } from 'react-router';
import { useAuth } from './lib/auth-context';
// Notice the added /ui/ and the lowercase 's' here!
import Sidebar from './components/ui/sidebar';

export default function Root() {
  const { loading, user } = useAuth();

  // Keep your loading state while auth initializes
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // No active session — send the user to the sign-in page. /login and /setup
  // are mounted outside of Root so they remain reachable.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* 1. Inject your new Sidebar component */}
      <Sidebar />

      {/* 2. Main Content Area */}
      {/* The new Sidebar is fixed and 240px wide, so we push the main content right by 240px */}
      <main
        className="flex-1 overflow-auto transition-colors duration-200"
        style={{ marginLeft: 240, minHeight: '100vh' }}
      >
        <div className="h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
