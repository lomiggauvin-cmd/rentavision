"use client";

import { ReactNode } from "react";
import { useAuth } from "./AuthModal";

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  return <>{children}</>;
}
