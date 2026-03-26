"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { getCurrentUser, onAuthStateChange } from "@/lib/auth";
import { signInWithEmail, signUpWithEmail, signInWithGoogle, signOut } from "@/lib/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        const { error } = await signUpWithEmail(email, password);
        if (error) throw error;
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      onClose();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/[0.08] p-6 mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {isSignUp ? "Créer un compte" : "Se connecter"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-400 transition-colors"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-400 transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-400 hover:bg-brand-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Chargement..." : isSignUp ? "Créer un compte" : "Se connecter"}
          </button>
        </form>

        <div className="mt-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-white/[0.08] text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="text-lg">G</span>
            Continuer avec Google
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-brand-400 hover:text-brand-300 text-sm transition-colors"
          >
            {isSignUp 
              ? "Déjà un compte ? Se connecter" 
              : "Pas de compte ? S'inscrire"
            }
          </button>
        </div>
      </div>
    </div>
  );
}

interface AccountButtonProps {
  user: User | null;
  onSignOut: () => void;
  onOpenAuth: () => void;
}

export function AccountButton({ user, onSignOut, onOpenAuth }: AccountButtonProps) {
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400 hidden sm:block">
          {user.email}
        </span>
        <button
          onClick={onSignOut}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/[0.08] text-white text-sm font-medium rounded-lg transition-colors"
        >
          Déconnexion
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onOpenAuth}
      className="px-4 py-2 bg-brand-400 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors"
    >
      Se connecter
    </button>
  );
}

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Récupérer la session au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Écouter les changements (connexion / déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 3. Nettoyage V2 propre quand on quitte la page
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
