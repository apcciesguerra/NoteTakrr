import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { User, Session } from "@supabase/supabase-js";

const TEST_EMAIL = "test@email.com";
const TEST_PASSWORD = "123456"; // Note: Supabase defaults to min 6 chars, but using as requested

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        handleTestLogin();
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleTestLogin = async () => {
    setIsLoading(true);
    // Try signing in first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (signInError) {
      // If user doesn't exist, sign them up instead
      await supabase.auth.signUp({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
    }
  };

  return {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
  };
}

export default useAuth;
