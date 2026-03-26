"use client";

import { useState } from "react";
import { useAuth, AccountButton } from "./AuthModal";
import AuthModal from "./AuthModal";
import { signOut } from "@/lib/auth";

export default function HeaderAccount() {
  const { user, loading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="w-20 h-8 bg-slate-800 rounded-lg animate-pulse" />
    );
  }

  return (
    <>
      <AccountButton
        user={user}
        onSignOut={handleSignOut}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}
