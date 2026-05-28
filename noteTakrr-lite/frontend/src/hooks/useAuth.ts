/**
 * useAuth hook - Manages Supabase authentication state.
 */

export function useAuth() {
  // TODO: Implement Supabase auth hook
  // - Handle sign in/out
  // - Track session state
  // - Provide user info
  return {
    user: null,
    signIn: async () => {},
    signOut: async () => {},
    isAuthenticated: false,
    isLoading: true,
  };
}

export default useAuth;
