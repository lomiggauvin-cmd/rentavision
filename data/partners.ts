export interface Pricing {
  commissionPercent: number;
  cleaningFee: number;
  includedServices: string[];
}

export interface Concierge {
  id: string;
  city: string;
  companyName: string;
  contactName: string;
  email: string;
  avatarUrl: string;
  rating: number;
  pricing: Pricing;
}

export interface Accountant {
  id: string;
  name: string;
  type: "Solution IA" | "Cabinet Humain";
  annualPrice: number;
  location: string;
  specialties: string[];
  rating: number;
  description: string;
}

export const partnersData = {
  conciergeries: [
    {
      id: "conc_1",
      city: "Paris",
      companyName: "ParisBnB Premium",
      contactName: "Sophie Martin",
      email: "sophie@parisbnb-premium.fr",
      avatarUrl: "https://i.pravatar.cc/150?u=sophie",
      rating: 4.8,
      pricing: {
        commissionPercent: 20,
        cleaningFee: 60,
        includedServices: ["Check-in physique", "Ménage pro", "Linge de lit", "Gestion des prix dynamique"],
      },
    },
    {
      id: "conc_2",
      city: "Paris",
      companyName: "Host & Go",
      contactName: "Thomas Dubois",
      email: "contact@hostandgo-paris.com",
      avatarUrl: "https://i.pravatar.cc/150?u=thomas",
      rating: 4.5,
      pricing: {
        commissionPercent: 18,
        cleaningFee: 50,
        includedServices: ["Boîte à clés", "Ménage standard", "Assistance voyageur 24/7"],
      },
    },
    {
      id: "conc_3",
      city: "Lille",
      companyName: "Flandres Conciergerie",
      contactName: "Maxime Leroy",
      email: "maxime@flandres-conciergerie.fr",
      avatarUrl: "https://i.pravatar.cc/150?u=maxime",
      rating: 4.9,
      pricing: {
        commissionPercent: 22,
        cleaningFee: 40,
        includedServices: ["Check-in physique", "Panier d'accueil local", "Ménage pro", "Linge de maison"],
      },
    },
    {
      id: "conc_4",
      city: "Marseille",
      companyName: "Sud Accueil Massilia",
      contactName: "Clara Masson",
      email: "clara@sudaccueil.com",
      avatarUrl: "https://i.pravatar.cc/150?u=clara",
      rating: 4.7,
      pricing: {
        commissionPercent: 15,
        cleaningFee: 45,
        includedServices: ["Gestion des annonces", "Ménage", "Maintenance petites réparations"],
      },
    },
  ] as Concierge[],

  comptables: [
    {
      id: "comp_1",
      name: "Qlower (Solution IA)",
      type: "Solution IA",
      annualPrice: 240,
      location: "100% En ligne (National)",
      specialties: ["LMNP Automatisé", "Connexion Bancaire", "Courte durée"],
      rating: 4.8,
      description: "L'application qui automatise votre comptabilité immobilière grâce à l'IA. Génération de la liasse fiscale en 3 clics.",
    },
    {
      id: "comp_2",
      name: "Expertise Immo Paris",
      type: "Cabinet Humain",
      annualPrice: 600,
      location: "Paris & Île-de-France",
      specialties: ["LMNP au Réel", "SCI à l'IS", "Déficit foncier", "Stratégie patrimoniale"],
      rating: 4.9,
      description: "Un expert-comptable dédié pour optimiser votre fiscalité et vous accompagner dans vos prochains investissements.",
    },
    {
      id: "comp_3",
      name: "Declara-Meublé",
      type: "Solution IA",
      annualPrice: 150,
      location: "100% En ligne (National)",
      specialties: ["Micro-BIC", "LMNP", "Assistance Chatbot"],
      rating: 4.5,
      description: "La solution la plus économique pour les déclarations simples. Laissez notre algorithme remplir vos cases d'impôts.",
    },
    {
      id: "comp_4",
      name: "Nord Compta Patrimoine",
      type: "Cabinet Humain",
      annualPrice: 550,
      location: "Lille (Hauts-de-France)",
      specialties: ["LMP / LMNP", "Démembrement", "SCI"],
      rating: 4.7,
      description: "Cabinet lillois historique spécialisé dans l'accompagnement des investisseurs locatifs du Nord.",
    },
  ] as Accountant[],
};
