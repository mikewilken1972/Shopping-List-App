/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useMemo, type FormEvent, Component, type ReactNode } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  ShoppingBag, 
  ChevronRight, 
  X,
  Filter,
  LayoutGrid,
  List as ListIcon,
  Search,
  Pencil,
  Check,
  Tag,
  LogOut,
  LogIn,
  Settings,
  ArrowUpDown,
  History,
  Users,
  Share2,
  User as UserIcon,
  Mail,
  Send,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Loader2,
  Mic,
  MicOff,
  Camera,
  TicketPercent,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, signInWithGoogle, logout, signInWithEmailAndPassword, createUserWithEmailAndPassword } from './firebase';
import { GoogleGenAI } from "@google/genai";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  doc, 
  orderBy,
  writeBatch,
  setDoc,
  increment
} from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';

interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
  category: string;
  store: string;
  onSale: boolean;
  price?: number;
  quantity?: string;
  comment?: string;
  imageUrl?: string;
  createdAt: number;
  userId: string;
  addedByName?: string;
  listId: string;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  lastSeen: number;
}

interface ShoppingList {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  invitedEmails: string[];
  createdAt: number;
}

interface UserSettings {
  categories: string[];
  stores: string[];
  activeListId?: string;
  email?: string;
}

interface HistoryItem {
  id: string;
  text: string;
  category: string;
  store: string;
  price?: number;
  quantity?: string;
  comment?: string;
  userId: string;
  lastUsed: number;
  purchaseCount?: number;
}

const CATEGORIES = [
  "Grøntsager & Frugt",
  "Mejeri & Æg",
  "Kød & Fisk",
  "Kolonial",
  "Bageri",
  "Frost",
  "Husholdning",
  "Andet"
];

const CATEGORY_COLORS: Record<string, { bg: string, text: string, iconBg: string }> = {
  "Grøntsager & Frugt": { bg: "bg-emerald-50", text: "text-emerald-700", iconBg: "bg-emerald-100" },
  "Mejeri & Æg": { bg: "bg-orange-50", text: "text-orange-700", iconBg: "bg-orange-100" },
  "Kød & Fisk": { bg: "bg-red-50", text: "text-red-700", iconBg: "bg-red-100" },
  "Kolonial": { bg: "bg-amber-50", text: "text-amber-700", iconBg: "bg-amber-100" },
  "Bageri": { bg: "bg-yellow-50", text: "text-yellow-700", iconBg: "bg-yellow-100" },
  "Frost": { bg: "bg-blue-50", text: "text-blue-700", iconBg: "bg-blue-100" },
  "Husholdning": { bg: "bg-purple-50", text: "text-purple-700", iconBg: "bg-purple-100" },
  "Andet": { bg: "bg-gray-50", text: "text-gray-700", iconBg: "bg-gray-100" }
};

const STORES = [
  "Rema1000",
  "Lidl",
  "Netto",
  "Føtex",
  "SuperBrugsen",
  "Other"
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-red-900">Ups! Noget gik galt</h1>
            <p className="text-gray-600 text-sm mb-6">
              Der opstod en fejl i applikationen. Prøv at genindlæse siden.
            </p>
            <div className="bg-gray-50 p-4 rounded-xl text-left mb-6 overflow-auto max-h-32">
              <code className="text-xs text-red-800">{this.state.error?.message}</code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              Genindlæs side
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ShoppingListApp />
    </ErrorBoundary>
  );
}

function ShoppingListApp() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [inputPrice, setInputPrice] = useState('');
  const [inputQuantity, setInputQuantity] = useState('');
  const [inputComment, setInputComment] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [selectedStore, setSelectedStore] = useState('');
  const [onSale, setOnSale] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'history' | 'settings' | 'offers'>('list');
  const [isSearchingOffers, setIsSearchingOffers] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const [selectedOfferStore, setSelectedOfferStore] = useState<string>('');

  const OFFER_STORES = [
    { name: 'Rema 1000', color: 'bg-blue-600', text: 'text-white' },
    { name: 'Netto', color: 'bg-yellow-400', text: 'text-black' },
    { name: 'Lidl', color: 'bg-blue-700', text: 'text-white' },
    { name: 'Føtex', color: 'bg-blue-900', text: 'text-white' },
    { name: 'Bilka', color: 'bg-blue-800', text: 'text-white' },
    { name: 'SuperBrugsen', color: 'bg-red-600', text: 'text-white' }
  ];
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [userCategories, setUserCategories] = useState<string[]>(CATEGORIES);
  const [userStores, setUserStores] = useState<string[]>(STORES);
  const [newCategory, setNewCategory] = useState('');
  const [newStore, setNewStore] = useState('');
  const [sortBy, setSortBy] = useState<'none' | 'category' | 'store'>('category');
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [userLists, setUserLists] = useState<ShoppingList[]>([]);
  const [activeList, setActiveList] = useState<ShoppingList | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isGeneratingImage, setIsGeneratingImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({});
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailToSend, setEmailToSend] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  // Auth states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Ensure selectedCategory is always valid
  useEffect(() => {
    if (userCategories.length > 0 && !userCategories.includes(selectedCategory)) {
      setSelectedCategory(userCategories[0]);
    }
  }, [userCategories, selectedCategory]);

    // Derive unique items from history for autofill
  const itemHistory = useMemo(() => {
    const history: Record<string, { category: string; store: string; quantity: string }> = {};
    // Add some defaults
    const defaults: Record<string, { category: string; store: string; quantity: string }> = {
      'Mælk': { category: 'Mejeri & Æg', store: '', quantity: '' },
      'Æg': { category: 'Mejeri & Æg', store: '', quantity: '' },
      'Brød': { category: 'Bageri', store: '', quantity: '' },
      'Smør': { category: 'Mejeri & Æg', store: '', quantity: '' },
      'Ost': { category: 'Mejeri & Æg', store: '', quantity: '' },
      'Æbler': { category: 'Grøntsager & Frugt', store: '', quantity: '' },
      'Bananer': { category: 'Grøntsager & Frugt', store: '', quantity: '' },
      'Pærer': { category: 'Grøntsager & Frugt', store: '', quantity: '' },
      'Agurk': { category: 'Grøntsager & Frugt', store: '', quantity: '' },
      'Tomater': { category: 'Grøntsager & Frugt', store: '', quantity: '' },
      'Kylling': { category: 'Kød & Fisk', store: '', quantity: '' },
      'Hakket oksekød': { category: 'Kød & Fisk', store: '', quantity: '' },
      'Pasta': { category: 'Kolonial', store: '', quantity: '' },
      'Ris': { category: 'Kolonial', store: '', quantity: '' },
      'Kaffe': { category: 'Kolonial', store: '', quantity: '' },
      'Toiletpapir': { category: 'Husholdning', store: '', quantity: '' },
      'Opvaskemiddel': { category: 'Husholdning', store: '', quantity: '' },
    };

    // Merge defaults with history from Firestore
    Object.assign(history, defaults);
    historyItems.forEach(item => {
      history[item.text] = { category: item.category, store: item.store, quantity: item.quantity || '' };
    });

    return history;
  }, [historyItems]);

  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    return Object.keys(itemHistory)
      .filter(name => name.toLowerCase().includes(inputValue.toLowerCase()) && name !== inputValue)
      .slice(0, 5);
  }, [inputValue, itemHistory]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setShowSuggestions(true);
    
    // Auto-select category/store if exact match found
    if (itemHistory[value]) {
      setSelectedCategory(itemHistory[value].category);
      setSelectedStore(itemHistory[value].store);
      setInputQuantity(itemHistory[value].quantity);
    }
  };

  const selectSuggestion = (name: string) => {
    setInputValue(name);
    setSelectedCategory(itemHistory[name].category);
    setSelectedStore(itemHistory[name].store);
    setInputQuantity(itemHistory[name].quantity);
    setShowSuggestions(false);
  };
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterCategory, setFilterCategory] = useState<string | 'Alle'>('Alle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editStore, setEditStore] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editOnSale, setEditOnSale] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editComment, setEditComment] = useState('');

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Update user profile
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonym',
          photoURL: currentUser.photoURL || '',
          lastSeen: Date.now()
        }, { merge: true });
      }
    });
    return () => unsubscribe();
  }, []);

  // Presence heartbeat
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      await setDoc(doc(db, 'users', user.uid), {
        lastSeen: Date.now()
      }, { merge: true });
    }, 60000); // Every minute
    return () => clearInterval(interval);
  }, [user]);

  // Settings listener
  useEffect(() => {
    if (!user) {
      setIsInitializing(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'userSettings', user.uid), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserSettings;
        if (data.categories) setUserCategories(data.categories);
        if (data.stores) setUserStores(data.stores);
        if (data.activeListId) {
          setActiveListId(data.activeListId);
        } else {
          await initializeDefaultList(user);
        }
      } else {
        await initializeDefaultList(user);
      }
      setIsInitializing(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'userSettings');
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, [user]);

  const initializeDefaultList = async (currentUser: User) => {
    try {
      const listRef = doc(collection(db, 'lists'));
      const newList: ShoppingList = {
        id: listRef.id,
        name: 'Shopping List',
        ownerId: currentUser.uid,
        members: [currentUser.uid],
        invitedEmails: [],
        createdAt: Date.now()
      };
      await setDoc(listRef, newList);

      await setDoc(doc(db, 'userSettings', currentUser.uid), {
        activeListId: listRef.id,
        email: currentUser.email,
        categories: CATEGORIES,
        stores: STORES
      }, { merge: true });
      
      setActiveListId(listRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'initialize-default-list');
    }
  };

  // Lists listener
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'lists'),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lists = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ShoppingList[];
      setUserLists(lists);
    });

    return () => unsubscribe();
  }, [user]);

  // Active list listener
  useEffect(() => {
    if (!activeListId) {
      setActiveList(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'lists', activeListId), (snapshot) => {
      if (snapshot.exists()) {
        setActiveList({ ...snapshot.data(), id: snapshot.id } as ShoppingList);
      }
    });

    return () => unsubscribe();
  }, [activeListId]);

  // Fetch member profiles when active list changes
  useEffect(() => {
    if (!activeList || !activeList.members.length) {
      setMemberProfiles({});
      return;
    }

    const q = query(
      collection(db, 'users'),
      where('uid', 'in', activeList.members)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profiles: Record<string, UserProfile> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as UserProfile;
        profiles[data.uid] = data;
      });
      setMemberProfiles(profiles);
    });

    return () => unsubscribe();
  }, [activeList]);

  // Items listener
  useEffect(() => {
    if (!user || !activeListId) {
      setItems([]);
      return;
    }

    const q = query(
      collection(db, 'shoppingItems'),
      where('listId', '==', activeListId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newItems = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as ShoppingItem[];
      setItems(newItems);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'shoppingItems');
    });

    return () => unsubscribe();
  }, [user, activeListId]);

  // History listener
  useEffect(() => {
    if (!user) {
      setHistoryItems([]);
      return;
    }

    const q = query(
      collection(db, 'itemHistory'),
      where('userId', '==', user.uid),
      orderBy('lastUsed', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newHistory = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as HistoryItem[];
      setHistoryItems(newHistory);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'itemHistory');
    });

    return () => unsubscribe();
  }, [user]);

  // Check for invitations
  useEffect(() => {
    if (!user || !user.email) return;

    const q = query(
      collection(db, 'lists'),
      where('invitedEmails', 'array-contains', user.email.toLowerCase())
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const batch = writeBatch(db);
      snapshot.docs.forEach(listDoc => {
        const data = listDoc.data() as ShoppingList;
        if (!data.members.includes(user.uid)) {
          batch.update(listDoc.ref, {
            members: [...data.members, user.uid],
            invitedEmails: data.invitedEmails.filter(e => e !== user.email?.toLowerCase())
          });
        }
      });
      if (!snapshot.empty) {
        try {
          await batch.commit();
        } catch (error) {
          console.error("Error accepting invitations:", error);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchOffers = async (storeName: string) => {
    setIsSearchingOffers(true);
    setSelectedOfferStore(storeName);
    setOffers([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Find de 10-15 bedste aktuelle tilbud fra ${storeName} i Danmark i denne uge. 
      Søg efter varer med navn, pris (i DKK) og mængde/enhed. 
      Formatér resultatet som et JSON array af objekter med felterne: 'text', 'price', 'quantity', 'category'.
      Vigtigt: Kun JSON, intet andet. Hvis du ikke finder specifikke priser, så estimer dem baseret på kendskab til ${storeName}.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        }
      });

      if (response.text) {
        const parsedOffers = JSON.parse(response.text.trim());
        setOffers(Array.isArray(parsedOffers) ? parsedOffers : []);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      // Fallback data
      setOffers([
        { text: "Mælk", price: 10, quantity: "1L", category: "Mejeri & Æg" },
        { text: "Smør", price: 15, quantity: "250g", category: "Mejeri & Æg" }
      ]);
    } finally {
      setIsSearchingOffers(false);
    }
  };

  const addOfferToList = async (offer: any) => {
    if (!activeListId || !user) return;
    
    const newItem = {
      text: offer.text,
      category: offer.category || 'Andet',
      store: selectedOfferStore,
      quantity: offer.quantity || '1 stk',
      price: Number(offer.price) || 0,
      completed: false,
      uid: user.uid,
      authorName: user.displayName || user.email,
      createdAt: new Date().toISOString(),
      comment: 'Tilbud fra avis',
      listId: activeListId
    };

    try {
      await addDoc(collection(db, 'shoppingItems'), newItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'shoppingItems');
    }
  };

  const addItem = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !user || !activeListId) return;

    const newItem: any = {
      text: inputValue.trim(),
      completed: false,
      category: selectedCategory,
      store: selectedStore,
      quantity: inputQuantity.trim() || null,
      comment: inputComment.trim() || null,
      onSale: onSale,
      createdAt: Date.now(),
      userId: user.uid,
      addedByName: user.displayName || user.email?.split('@')[0] || 'Anonym',
      listId: activeListId
    };

    if (inputPrice.trim()) {
      const price = parseFloat(inputPrice.replace(',', '.'));
      if (!isNaN(price)) {
        newItem.price = price;
      }
    }

    try {
      await addDoc(collection(db, 'shoppingItems'), newItem);
      
      // Update history
      const historyId = `${newItem.text.toLowerCase().replace(/\s+/g, '_')}_${user.uid}`;
      const historyItem: any = {
        text: newItem.text,
        category: newItem.category,
        store: newItem.store,
        quantity: newItem.quantity,
        comment: newItem.comment,
        userId: user.uid,
        lastUsed: Date.now()
      };
      if (newItem.price) historyItem.price = newItem.price;
      
      await setDoc(doc(db, 'itemHistory', historyId), historyItem, { merge: true });

      setInputValue('');
      setInputPrice('');
      setInputQuantity('');
      setInputComment('');
      setOnSale(false);
      setShowSuggestions(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shoppingItems');
    }
  };

  const addFromHistory = async (historyItem: HistoryItem) => {
    if (!user || !activeListId) return;
    
    const newItem: any = {
      text: historyItem.text,
      completed: false,
      category: historyItem.category,
      store: historyItem.store,
      quantity: historyItem.quantity || null,
      comment: historyItem.comment || null,
      createdAt: Date.now(),
      userId: user.uid,
      addedByName: user.displayName || user.email?.split('@')[0] || 'Anonym',
      listId: activeListId,
      onSale: false
    };
    if (historyItem.price) newItem.price = historyItem.price;

    try {
      await addDoc(collection(db, 'shoppingItems'), newItem);
      // Update lastUsed in history
      await updateDoc(doc(db, 'itemHistory', historyItem.id), {
        lastUsed: Date.now()
      });
      setActiveTab('list');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shoppingItems-from-history');
    }
  };

  const toggleItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    const newCompleted = !item.completed;
    
    try {
      if (newCompleted && user) {
        // Update history lastUsed immediately when checked
        const historyId = `${item.text.toLowerCase().replace(/\s+/g, '_')}_${user.uid}`;
        await setDoc(doc(db, 'itemHistory', historyId), {
          lastUsed: Date.now()
        }, { merge: true });
      }

      await updateDoc(doc(db, 'shoppingItems', id), {
        completed: newCompleted
      });

      // Auto-transfer to history after a short delay if completed
      if (newCompleted) {
        setTimeout(() => {
          clearCompleted();
        }, 3000);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `shoppingItems/${id}`);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shoppingItems', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `shoppingItems/${id}`);
    }
  };

  const clearCompleted = async () => {
    if (!user) return;
    const completed = items.filter(item => item.completed);
    if (completed.length === 0) return;

    const batch = writeBatch(db);
    
    completed.forEach(item => {
      // 1. Update history for each cleared item
      const historyId = `${item.text.toLowerCase().replace(/\s+/g, '_')}_${user.uid}`;
      const historyItem: any = {
        text: item.text,
        category: item.category,
        store: item.store || '',
        quantity: item.quantity || '',
        comment: item.comment || '',
        userId: user.uid,
        lastUsed: Date.now(),
        purchaseCount: increment(1)
      };
      if (item.price) historyItem.price = item.price;
      if (item.imageUrl) historyItem.imageUrl = item.imageUrl;

      // We use setDoc with merge in a batch if possible, but writeBatch doesn't support setDoc with merge easily in all versions
      // Actually batch.set(docRef, data, {merge: true}) is supported.
      batch.set(doc(db, 'itemHistory', historyId), historyItem, { merge: true });

      // 2. Delete from shopping items
      batch.delete(doc(db, 'shoppingItems', item.id));
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'clear-completed-to-history');
    }
  };

  const startEditing = (item: ShoppingItem) => {
    setEditingId(item.id);
    setEditValue(item.text);
    setEditStore(item.store);
    setEditCategory(item.category);
    setEditOnSale(item.onSale || false);
    setEditPrice(item.price?.toString() || '');
    setEditQuantity(item.quantity || '');
    setEditComment(item.comment || '');
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }
    
    const updates: any = {
      text: editValue.trim(),
      store: editStore,
      category: editCategory,
      quantity: editQuantity.trim() || null,
      comment: editComment.trim() || null,
      onSale: editOnSale
    };

    if (editPrice.trim()) {
      const price = parseFloat(editPrice.replace(',', '.'));
      if (!isNaN(price)) {
        updates.price = price;
      } else {
        updates.price = null;
      }
    } else {
      updates.price = null;
    }
    
    try {
      await updateDoc(doc(db, 'shoppingItems', id), updates);
      
      // Update history
      if (user) {
        const historyId = `${updates.text.toLowerCase().replace(/\s+/g, '_')}_${user.uid}`;
        const historyItem: any = {
          text: updates.text,
          category: updates.category,
          store: updates.store,
          quantity: updates.quantity,
          comment: updates.comment,
          userId: user.uid,
          lastUsed: Date.now()
        };
        if (updates.price) historyItem.price = updates.price;
        if (updates.imageUrl) historyItem.imageUrl = updates.imageUrl;
        
        await setDoc(doc(db, 'itemHistory', historyId), historyItem, { merge: true });
      }

      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `shoppingItems/${id}`);
    }
  };

  const resizeImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Use JPEG with 0.7 quality to reduce size
      };
    });
  };

  const generateImage = async (item: ShoppingItem) => {
    if (!process.env.GEMINI_API_KEY) {
      alert("Gemini API nøgle mangler. Kontakt administratoren.");
      return;
    }

    setIsGeneratingImage(item.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              text: `Find and generate a high-quality, clean isolated product photo of ${item.text}. Use style and source inspiration from Danish supermarket flyers (tilbudsaviser) specifically from Rema 1000, Netto, and Lidl. The image should be professional, with a minimalist background, exactly like the product photos used in their weekly offers.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
          tools: [
            {
              googleSearch: {
                searchTypes: {
                  webSearch: {},
                  imageSearch: {},
                }
              }
            }
          ]
        },
      });

      let rawImageUrl = '';
      if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            rawImageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (rawImageUrl) {
        // Resize image to ensure it fits in Firestore (1MB limit)
        const imageUrl = await resizeImage(rawImageUrl);
        
        await updateDoc(doc(db, 'shoppingItems', item.id), { imageUrl });
        
        // Update history too
        if (user) {
          const historyId = `${item.text.toLowerCase().replace(/\s+/g, '_')}_${user.uid}`;
          await setDoc(doc(db, 'itemHistory', historyId), { imageUrl }, { merge: true });
        }
      }
    } catch (error) {
      console.error("Error generating image:", error);
      handleFirestoreError(error, OperationType.UPDATE, `shoppingItems/${item.id}-generate-image`);
    } finally {
      setIsGeneratingImage(null);
    }
  };

  const parseVoiceInput = async (text: string) => {
    if (!process.env.GEMINI_API_KEY || !user || !activeListId) return;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Parse the following voice command for a shopping list app into a JSON array of items. 
        Each item should have: "text" (string), "quantity" (string or null), "category" (string).
        Use these categories: ${userCategories.join(', ')}.
        Command: "${text}"
        Return ONLY the JSON array.`,
        config: {
          responseMimeType: "application/json",
        }
      });

      const parsedItems = JSON.parse(response.text);
      if (Array.isArray(parsedItems)) {
        const batch = writeBatch(db);
        for (const itemData of parsedItems) {
          const itemRef = doc(collection(db, 'shoppingItems'));
          const newItem: ShoppingItem = {
            id: itemRef.id,
            text: itemData.text,
            completed: false,
            category: itemData.category || userCategories[0],
            store: '',
            onSale: false,
            quantity: itemData.quantity || null,
            createdAt: Date.now(),
            userId: user.uid,
            addedByName: user.displayName || user.email?.split('@')[0] || 'Anonym',
            listId: activeListId
          };
          batch.set(itemRef, newItem);

          // Update history
          const historyId = `${itemData.text.toLowerCase().replace(/\s+/g, '_')}_${user.uid}`;
          const historyRef = doc(db, 'itemHistory', historyId);
          batch.set(historyRef, {
            id: historyId,
            text: itemData.text,
            category: itemData.category || userCategories[0],
            store: '',
            quantity: itemData.quantity || null,
            userId: user.uid,
            lastUsed: Date.now()
          }, { merge: true });
        }
        await batch.commit();
      }
    } catch (error) {
      console.error("Error parsing voice input:", error);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Din browser understøtter ikke stemmestyring.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'da-DK';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      parseVoiceInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !process.env.GEMINI_API_KEY || !user || !activeListId) return;

    setIsAnalyzingImage(true);
    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64String,
                mimeType: file.type
              }
            },
            {
              text: `Analyze this image and identify the main product. I want to add it to my shopping list.
Return ONLY a JSON object with:
"text": string (name of item),
"quantity": string or null (e.g., "1 liter" if visible),
"category": string (must be one of: ${userCategories.join(', ')}),
"store": string (if identifiable brand or store logo is visible, otherwise empty string).`
            }
          ]
        },
        config: {
          responseMimeType: "application/json"
        }
      });

      const itemData = JSON.parse(response.text);
      if (itemData && itemData.text) {
        const itemRef = doc(collection(db, 'shoppingItems'));
        
        let imageUrl = null;
        try {
          imageUrl = await resizeImage(`data:${file.type};base64,${base64String}`);
        } catch (imgError) {
          console.warn('Could not resize image for saving:', imgError);
        }

        const newItem: ShoppingItem = {
          id: itemRef.id,
          text: itemData.text,
          completed: false,
          category: itemData.category || userCategories[0],
          store: itemData.store || '',
          onSale: false,
          quantity: itemData.quantity || null,
          createdAt: Date.now(),
          userId: user.uid,
          addedByName: user.displayName || user.email?.split('@')[0] || 'Anonym',
          listId: activeListId,
          imageUrl: imageUrl || undefined
        };
        
        const batch = writeBatch(db);
        batch.set(itemRef, newItem);

        const historyId = `${itemData.text.toLowerCase().replace(/\s+/g, '_')}_${user.uid}`;
        const historyRef = doc(db, 'itemHistory', historyId);
        batch.set(historyRef, {
          id: historyId,
          text: itemData.text,
          category: newItem.category,
          store: newItem.store,
          quantity: newItem.quantity,
          userId: user.uid,
          imageUrl: newItem.imageUrl || undefined,
          lastUsed: Date.now()
        }, { merge: true });

        await batch.commit();
      }
    } catch (error) {
      console.error("Error analyzing image:", error);
      alert("Kunne ikke genkende varen på billedet.");
    } finally {
      setIsAnalyzingImage(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, item: ShoppingItem) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB for initial upload, then we resize)
    if (file.size > 5 * 1024 * 1024) {
      alert("Billedet er for stort. Vælg et billede under 5MB.");
      return;
    }

    setIsUploadingImage(item.id);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      try {
        const imageUrl = await resizeImage(rawBase64);
        await updateDoc(doc(db, 'shoppingItems', item.id), { imageUrl });
        
        // Update history too
        if (user) {
          const historyId = `${item.text.toLowerCase().replace(/\s+/g, '_')}_${user.uid}`;
          await setDoc(doc(db, 'itemHistory', historyId), { imageUrl }, { merge: true });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `shoppingItems/${item.id}-upload-image`);
      } finally {
        setIsUploadingImage(null);
        // Clear input to allow uploading the same file again if needed
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const addCategory = async () => {
    if (!newCategory.trim() || !user) return;
    const updated = [...userCategories, newCategory.trim()];
    try {
      await setDoc(doc(db, 'userSettings', user.uid), { categories: updated }, { merge: true });
      setNewCategory('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'userSettings-categories');
    }
  };

  const removeCategory = async (cat: string) => {
    if (!user) return;
    const updated = userCategories.filter(c => c !== cat);
    try {
      await setDoc(doc(db, 'userSettings', user.uid), { categories: updated }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'userSettings-categories-remove');
    }
  };

  const addStore = async () => {
    if (!newStore.trim() || !user) return;
    const updated = [...userStores, newStore.trim()];
    try {
      await setDoc(doc(db, 'userSettings', user.uid), { stores: updated }, { merge: true });
      setNewStore('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'userSettings-stores');
    }
  };

  const removeStore = async (store: string) => {
    if (!user) return;
    const updated = userStores.filter(s => s !== store);
    try {
      await setDoc(doc(db, 'userSettings', user.uid), { stores: updated }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'userSettings-stores-remove');
    }
  };

  const inviteUser = async () => {
    if (!inviteEmail.trim() || !activeListId || !user) return;
    
    try {
      const listRef = doc(db, 'lists', activeListId);
      const email = inviteEmail.trim().toLowerCase();
      
      if (activeList?.invitedEmails.includes(email)) {
        alert('Brugeren er allerede inviteret');
        return;
      }

      await updateDoc(listRef, {
        invitedEmails: [...(activeList?.invitedEmails || []), email]
      });
      
      // Send invitation email
      const inviteHtml = `
        <h1>Du er blevet inviteret til en indkøbsliste!</h1>
        <p><strong>${user.displayName || user.email}</strong> har inviteret dig til at samarbejde på listen: <strong>${activeList?.name}</strong>.</p>
        <p>Log ind på appen med din e-mail (${email}) for at se listen.</p>
        <a href="${window.location.origin}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Åbn Shopping List App</a>
      `;
      
      try {
        await sendEmail(email, `Invitation til indkøbsliste: ${activeList?.name}`, inviteHtml);
      } catch (e) {
        console.error("Failed to send invitation email", e);
      }

      setInviteEmail('');
      alert(`Invitation sendt til ${email}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'invite-user');
    }
  };

  const removeInvitation = async (email: string) => {
    if (!activeListId || !activeList || !user) return;
    
    // Only owner can remove invitations
    if (activeList.ownerId !== user.uid) {
      alert('Kun ejeren af listen kan fjerne invitationer');
      return;
    }

    if (!confirm(`Er du sikker på, at du vil fjerne invitationen til ${email}?`)) return;

    try {
      const listRef = doc(db, 'lists', activeListId);
      const updatedInvites = activeList.invitedEmails.filter(e => e !== email);
      await updateDoc(listRef, {
        invitedEmails: updatedInvites
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'remove-invitation');
    }
  };

  const startRenamingList = (listId: string, currentName: string) => {
    setEditingListId(listId);
    setEditingListName(currentName);
  };

  const saveListName = async (listId: string) => {
    if (!user || !editingListName.trim()) {
      setEditingListId(null);
      return;
    }

    try {
      await updateDoc(doc(db, 'lists', listId), { name: editingListName.trim() });
      setEditingListId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'rename-list');
    }
  };

  const deleteList = async (listId: string, listName: string) => {
    if (!user) return;
    if (userLists.length <= 1) {
      alert('Du skal have mindst én liste.');
      return;
    }
    
    const confirmed = confirm(`Er du sikker på, at du vil slette listen "${listName}"? Alle varer i listen vil også blive slettet.`);
    if (!confirmed) return;

    try {
      // 1. Delete all items in the list
      const itemsQuery = query(collection(db, 'shoppingItems'), where('listId', '==', listId));
      const itemsSnapshot = await getDocs(itemsQuery);
      const batch = writeBatch(db);
      itemsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      // 2. Delete the list itself
      await deleteDoc(doc(db, 'lists', listId));

      // 3. Switch to another list if the deleted one was active
      if (activeListId === listId) {
        const otherList = userLists.find(l => l.id !== listId);
        if (otherList) {
          await switchList(otherList.id);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'delete-list');
    }
  };

  const switchList = async (listId: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'userSettings', user.uid), { activeListId: listId }, { merge: true });
      setActiveListId(listId);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'switch-list');
    }
  };

  const createNewList = async () => {
    if (!user) return;
    const defaultName = 'Ny Liste';

    try {
      const listRef = doc(collection(db, 'lists'));
      const newList: ShoppingList = {
        id: listRef.id,
        name: defaultName,
        ownerId: user.uid,
        members: [user.uid],
        invitedEmails: [],
        createdAt: Date.now()
      };
      await setDoc(listRef, newList);
      await switchList(listRef.id);
      // Automatically enter edit mode for the new list
      startRenamingList(listRef.id, defaultName);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'create-new-list');
    }
  };

  const sendEmail = async (to: string, subject: string, html: string) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, subject, html }),
      });
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      return await response.json();
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  };

  const sendListByEmail = () => {
    if (!user || !activeList || items.length === 0) return;
    setEmailToSend(user.email || '');
    setEmailStatus('idle');
    setShowEmailModal(true);
  };

  const confirmSendEmail = async () => {
    if (!user || !activeList || activeItems.length === 0 || !emailToSend.trim()) return;
    
    setIsSendingEmail(true);
    setEmailStatus('idle');

    const listHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h1 style="color: #2563eb; margin-bottom: 8px;">Indkøbsliste: ${activeList.name}</h1>
        <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Her er din indkøbsliste fra Shopping List App.</p>
        
        <ul style="list-style: none; padding: 0;">
          ${activeItems.map(item => `
            <li style="padding: 12px; border-bottom: 1px solid #f3f4f6; display: flex; flex-direction: column;">
              <div style="display: flex; align-items: center; width: 100%;">
                <span style="font-weight: 600; color: #374151;">
                  ${item.text}
                </span>
                ${item.quantity ? `<span style="margin-left: 8px; color: #6b7280; font-size: 13px;">(${item.quantity})</span>` : ''}
                <span style="margin-left: auto; font-size: 11px; font-weight: 700; color: #3b82f6; background: #eff6ff; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
                  ${item.category}
                </span>
                ${item.store ? `<span style="margin-left: 8px; font-size: 11px; font-weight: 700; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">${item.store}</span>` : ''}
                ${item.price ? `<span style="margin-left: 8px; font-size: 13px; font-weight: 700; color: #10b981;">${item.price} kr.</span>` : ''}
              </div>
              ${item.comment ? `<div style="margin-top: 4px; font-size: 12px; color: #9ca3af; font-style: italic;">${item.comment}</div>` : ''}
            </li>
          `).join('')}
        </ul>
        
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; text-align: center;">
          <p style="color: #999; font-size: 12px;">Sendt fra din Shopping List App</p>
        </div>
      </div>
    `;

    try {
      await sendEmail(emailToSend, `Indkøbsliste: ${activeList.name}`, listHtml);
      setEmailStatus('success');
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailStatus('error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const filteredItems = useMemo(() => {
    const filtered = items.filter(item => {
      const matchesSearch = item.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'Alle' || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'category') {
        return a.category.localeCompare(b.category);
      }
      if (sortBy === 'store') {
        const storeA = a.store || 'ÅÅÅ'; // Put items without store at the end
        const storeB = b.store || 'ÅÅÅ';
        return storeA.localeCompare(storeB);
      }
      return 0; // Ingen sortering (behold rækkefølge fra query)
    });
  }, [items, searchQuery, filterCategory, sortBy]);

  const { activeItems, completedItems } = useMemo(() => {
    const active = filteredItems.filter(item => !item.completed);
    const completed = filteredItems.filter(item => item.completed);
    return { activeItems: active, completedItems: completed };
  }, [filteredItems]);

  const quickAddSuggestions = useMemo(() => {
    const currentTexts = new Set(items.map(i => i.text.toLowerCase().trim()));
    return historyItems
      .filter(i => !currentTexts.has(i.text.toLowerCase().trim()))
      .sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0) || b.lastUsed - a.lastUsed)
      .slice(0, 8); // Top 8 suggestions
  }, [items, historyItems]);

  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter(i => i.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, percentage };
  }, [items]);

  const onlineCount = useMemo(() => {
    return (Object.values(memberProfiles) as UserProfile[]).filter(p => Date.now() - p.lastSeen < 120000).length;
  }, [memberProfiles]);

  const renderItem = (item: ShoppingItem) => {
    const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS["Andet"];

    return (
      <motion.div
        key={item.id}
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`group bg-white p-4 rounded-[2rem] border border-gray-100 flex items-center gap-4 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 hover:border-blue-100 ${item.completed ? 'opacity-60 bg-gray-50/50' : ''}`}
      >
        <button 
          onClick={() => toggleItem(item.id)}
          className={`flex-shrink-0 transition-all duration-500 transform active:scale-95 ${item.completed ? 'text-emerald-500' : 'text-gray-300 hover:text-blue-500 hover:scale-110'}`}
        >
          {item.completed ? <CheckCircle2 className="w-8 h-8" /> : <Circle className="w-8 h-8" />}
        </button>

        {item.imageUrl && (
          <div 
            onClick={() => setPreviewImageUrl(item.imageUrl!)}
            className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100 border-2 border-white shadow-sm cursor-zoom-in hover:scale-110 transition-transform duration-300 active:scale-95"
          >
            <img 
              src={item.imageUrl} 
              alt={item.text} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {editingId === item.id ? (
            <div className="flex flex-col gap-3 p-1">
              <input
                autoFocus
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit(item.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="w-full text-base font-bold bg-gray-50 border-none rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
              <div className="flex flex-wrap items-center gap-2">
                <select 
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="text-[10px] font-bold bg-white border border-gray-100 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {userCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select 
                  value={editStore}
                  onChange={(e) => setEditStore(e.target.value)}
                  className="text-[10px] font-bold bg-white border border-gray-100 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Ingen butik</option>
                  {userStores.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setEditOnSale(!editOnSale)}
                  className={`text-[10px] font-black px-2 py-1 rounded-lg transition-all ${editOnSale ? 'bg-red-500 text-white shadow-sm shadow-red-200' : 'bg-gray-100 text-gray-400'}`}
                >
                  TILBUD
                </button>
                <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-lg px-2 py-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">kr.</span>
                  <input
                    type="text"
                    placeholder="Pris"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-14 text-[10px] font-bold bg-transparent border-none outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-lg px-2 py-1">
                  <input
                    type="text"
                    placeholder="Antal"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-14 text-[10px] font-bold bg-transparent border-none outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-lg px-2 py-1 w-full sm:flex-1 min-h-[32px]">
                  <input
                    type="text"
                    placeholder="Kommentar"
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    className="w-full text-xs sm:text-[10px] font-medium bg-transparent border-none outline-none"
                  />
                </div>
                
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    id={`image-upload-${item.id}`}
                    onChange={(e) => handleFileUpload(e, item)}
                  />
                  <label
                    htmlFor={`image-upload-${item.id}`}
                    className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                    title="Upload billede"
                  >
                    {isUploadingImage === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => generateImage(item)}
                    disabled={isGeneratingImage === item.id}
                    className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50 shadow-sm"
                    title="Generer billede"
                  >
                    {isGeneratingImage === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </button>
                  <button 
                    onClick={() => saveEdit(item.id)}
                    className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-md shadow-emerald-200"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div 
              className={`cursor-pointer transition-opacity ${item.completed ? 'cursor-default transition-none' : 'hover:opacity-75'}`}
              onClick={() => !item.completed && startEditing(item)}
            >
              <div className="flex items-center gap-2 mb-1">
                <p className={`text-base font-bold tracking-tight transition-all duration-300 ${item.completed ? 'line-through text-gray-300' : 'text-gray-900 font-display'}`}>
                  {item.text}
                </p>
                {item.onSale && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded-md shadow-sm shadow-red-200 animate-pulse">
                    <Tag className="w-2.5 h-2.5" />
                    TILBUD
                  </span>
                )}
              </div>
              
              <div className="flex items-center flex-wrap gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border-b-2 shadow-sm ${colors.bg} ${colors.text} border-current/10`}>
                  {item.category}
                </span>
                {item.store && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">
                    {item.store}
                  </span>
                )}
                {item.price !== undefined && item.price !== null && (
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                    {item.price.toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr.
                  </span>
                )}
                {item.quantity && (
                  <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                    {item.quantity}
                  </span>
                )}
                {item.comment && (
                  <span className="text-xs sm:text-[10px] text-gray-400 italic font-medium line-clamp-2 sm:line-clamp-1 max-w-full sm:max-w-[150px]">
                    "{item.comment}"
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 pr-1">
          {!item.completed && (
            <button 
              onClick={() => startEditing(item)}
              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-2xl transition-all"
            >
              <Pencil className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => deleteItem(item.id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    );
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    setIsLoggingIn(true);
    setLoginError('');

    try {
      if (isSignUpMode) {
        await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setLoginError('Der findes allerede en bruger med denne e-mail.');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setLoginError('Forkert e-mail eller adgangskode.');
      } else if (error.code === 'auth/weak-password') {
        setLoginError('Adgangskoden er for svag (min. 6 tegn).');
      } else {
        setLoginError('Der opstod en fejl under login.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isAuthReady || (user && isInitializing)) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500 font-medium">Henter din liste...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-sm w-full text-center"
        >
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{isSignUpMode ? 'Opret Bruger' : 'Velkommen'}</h1>
          <p className="text-gray-500 text-sm mb-6">Log ind for at gemme din indkøbsliste i skyen og se den på alle dine enheder.</p>
          
          {window !== window.top && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm text-left">
              <strong>Bemærk:</strong> Du bruger appen i en forhåndsvisning. 
              Mange browsere (især Safari/iPhone) blokerer for login her. 
              <strong> Åbn venligst appen i en ny fane</strong> (brug pil-ikonet øverst til højre) for at logge ind.
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6 text-left">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">E-mail</label>
              <input 
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                placeholder="din@email.dk"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Adgangskode</label>
              <input 
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            
            {loginError && (
              <p className="text-xs text-red-500 text-center font-medium">{loginError}</p>
            )}

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {isSignUpMode ? 'Opret konto' : 'Log ind med e-mail'}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Eller</span>
            </div>
          </div>

          <button 
            onClick={async () => {
              if (window !== window.top) {
                setLoginError('Google Login virker ikke i forhåndsvisningen. Åbn venligst appen i en ny fane (brug pilen øverst til højre).');
                return;
              }
              try {
                setLoginError('');
                await signInWithGoogle();
              } catch (error: any) {
                console.error("Google login error:", error);
                setLoginError('Kunne ikke starte Google login. Hvis du er i preview-tilstand, prøv at åbne appen i en ny fane (ikonet i øverste højre hjørne), eller brug e-mail login.');
              }
            }}
            type="button"
            className="w-full bg-white border-2 border-gray-100 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Fortsæt med Google
          </button>

          <button 
            onClick={() => {
              setIsSignUpMode(!isSignUpMode);
              setLoginError('');
            }}
            className="text-xs text-blue-600 font-medium hover:underline"
          >
            {isSignUpMode ? 'Har du allerede en konto? Log ind' : 'Har du ikke en konto? Opret en nu'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#1a1a1a] font-sans selection:bg-blue-100 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header Section */}
        <header className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-[1.5rem] shadow-2xl shadow-blue-200 flex items-center justify-center transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                <ShoppingBag className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-black tracking-tight text-gray-900 leading-none mb-1">
                  {activeList?.name || 'Smart Shopping'}
                </h1>
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-300 flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  {activeList?.members.length || 1} {activeList?.members.length === 1 ? 'medlem' : 'medlemmer'}
                  {onlineCount > 0 && (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      {onlineCount} herinde
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={sendListByEmail}
                className="p-3 bg-white rounded-2xl border border-gray-100 text-gray-400 hover:text-emerald-500 hover:border-emerald-100 hover:bg-emerald-50 transition-all duration-300 shadow-sm"
                title="Send liste som mail"
              >
                <Send className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowShareModal(true)}
                className="p-3 bg-white rounded-2xl border border-gray-100 text-gray-400 hover:text-blue-500 hover:border-blue-100 hover:bg-blue-50 transition-all duration-300 shadow-sm"
                title="Del liste"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button 
                onClick={logout}
                className="p-3 bg-white rounded-2xl border border-gray-100 text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all duration-300 shadow-sm"
                title="Log ud"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {/* Progress Card */}
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all duration-500">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Fremgang</p>
                <h2 className="text-4xl font-display font-black text-gray-900 leading-none">
                  {stats.completed} <span className="text-2xl text-gray-300">af</span> {stats.total}
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Varer i kurven
                </p>
              </div>
              <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    className="text-gray-100"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="24"
                    cx="32"
                    cy="32"
                  />
                  <motion.circle
                    className="text-blue-600"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 24}
                    initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
                    animate={{ strokeDashoffset: (2 * Math.PI * 24) * (1 - stats.percentage / 100) }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="24"
                    cx="32"
                    cy="32"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle2 className={`w-6 h-6 transform transition-all duration-500 ${stats.percentage === 100 ? 'text-emerald-500 scale-110' : 'text-gray-100'}`} />
                </div>
              </div>
            </div>

            {/* View Controls & Tab Switcher */}
            <div className="space-y-4">
              <div className="flex p-1.5 bg-gray-200/50 rounded-[1.8rem] backdrop-blur-sm">
                <button
                  onClick={() => setActiveTab('list')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.4rem] text-[11px] font-black transition-all duration-500 uppercase tracking-widest ${
                    activeTab === 'list' 
                      ? 'bg-white text-blue-600 shadow-xl shadow-gray-200/50' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <ListIcon className="w-4 h-4" />
                  Liste
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.4rem] text-[11px] font-black transition-all duration-500 uppercase tracking-widest ${
                    activeTab === 'history' 
                      ? 'bg-white text-orange-600 shadow-xl shadow-gray-200/50' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <History className="w-4 h-4" />
                  Historik
                </button>
                <button
                  onClick={() => setActiveTab('offers')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.4rem] text-[11px] font-black transition-all duration-500 uppercase tracking-widest ${
                    activeTab === 'offers' 
                      ? 'bg-white text-emerald-600 shadow-xl shadow-gray-200/50' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <TicketPercent className="w-4 h-4" />
                  Tilbud
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.4rem] text-[11px] font-black transition-all duration-500 uppercase tracking-widest ${
                    activeTab === 'settings' 
                      ? 'bg-white text-purple-600 shadow-xl shadow-gray-200/50' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Indstil
                </button>
              </div>
            </div>
          </div>
        </header>

        {activeTab === 'list' ? (
          <>
            {/* Input Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <form onSubmit={addItem} className="space-y-4">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Hvad skal du købe?"
                className="w-full pl-4 pr-[6.5rem] py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-400"
              />
              <button 
                type="submit"
                disabled={!inputValue.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
              
              <button 
                type="button"
                onClick={toggleListening}
                className={`absolute right-[2.75rem] top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400 hover:text-blue-600'
                }`}
                title="Tilføj med stemmen"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <div className="absolute right-[5rem] top-1/2 -translate-y-1/2">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  ref={cameraInputRef}
                  onChange={handleCameraCapture}
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isAnalyzingImage}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                  title="Tilføj med kamera"
                >
                  {isAnalyzingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
              </div>

              {/* Suggestions Dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                  >
                    {suggestions.map(name => {
                      const cat = itemHistory[name].category;
                      const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS["Andet"];
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => selectSuggestion(name)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between group transition-colors border-b border-gray-50 last:border-none"
                        >
                          <span className="font-bold text-gray-800">{name}</span>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                            {cat}
                          </span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="w-full text-[10px] uppercase tracking-[0.2em] font-black text-gray-300 mb-1 mt-4 px-1">Kategori</div>
              {userCategories.map(cat => {
                const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS["Andet"];
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 transform active:scale-95 border ${
                      isSelected 
                        ? `${colors.bg} ${colors.text} border-transparent shadow-lg shadow-${colors.text.split('-')[1]}-200/50 scale-105` 
                        : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="w-full text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1 mt-2">Butik</div>
              {userStores.map(store => (
                <button
                  key={store}
                  type="button"
                  onClick={() => setSelectedStore(selectedStore === store ? '' : store)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedStore === store 
                      ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                      : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200'
                  }`}
                >
                  {store}
                </button>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setOnSale(!onSale)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  onSale 
                    ? 'bg-red-50 text-red-600 border border-red-100 shadow-sm' 
                    : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-200'
                }`}
              >
                <Tag className={`w-3.5 h-3.5 ${onSale ? 'animate-bounce' : ''}`} />
                ER PÅ TILBUD?
              </button>
              
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2 border border-gray-100 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <span className="text-xs text-gray-400 font-bold">kr.</span>
                <input
                  type="text"
                  placeholder="Pris (valgfrit)"
                  value={inputPrice}
                  onChange={(e) => setInputPrice(e.target.value)}
                  className="w-24 bg-transparent border-none outline-none text-xs font-medium"
                />
              </div>

              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2 border border-gray-100 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <input
                  type="text"
                  placeholder="Antal (valgfrit)"
                  value={inputQuantity}
                  onChange={(e) => setInputQuantity(e.target.value)}
                  className="w-32 bg-transparent border-none outline-none text-xs font-medium"
                />
              </div>

              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2 border border-gray-100 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all flex-1">
                <input
                  type="text"
                  placeholder="Kommentar (valgfrit)"
                  value={inputComment}
                  onChange={(e) => setInputComment(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xs font-medium"
                />
              </div>
            </div>
          </form>
        </section>

        {/* Quick Add Suggestions */}
        {quickAddSuggestions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-3 px-2">Hurtig tilføj</h2>
            <div className="flex flex-wrap gap-2 px-2">
              {quickAddSuggestions.map((suggestion) => (
                <button
                  key={`quick-add-${suggestion.id}`}
                  onClick={() => addFromHistory(suggestion)}
                  className="bg-white border border-gray-100 shadow-sm hover:shadow hover:border-blue-200 transition-all text-xs font-medium px-3 py-2 rounded-xl flex items-center gap-2 text-gray-700 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-500" />
                  {suggestion.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Controls & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-100 w-fit">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 flex-1 sm:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Søg i varer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none pr-8 relative"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%239ca3af\' stroke-width=\'2\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M8 9l4-4 4 4m0 6l-4 4-4-4\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1rem' }}
              >
                <option value="category">Sorter efter kategori</option>
                <option value="store">Sorter efter butik</option>
                <option value="none">Ingen sortering</option>
              </select>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Alle">Alle kategorier</option>
                {userCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* List Section */}
        <div className="space-y-8">
          {/* Active Items */}
          <div className={viewMode === 'list' ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
            <AnimatePresence mode="popLayout">
              {activeItems.length === 0 && completedItems.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="col-span-full py-20 text-center"
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                    <ShoppingBag className="w-8 h-8 text-gray-200" />
                  </div>
                  <p className="text-gray-400 text-sm">Ingen varer fundet</p>
                </motion.div>
              ) : (
                activeItems.flatMap((item, index) => {
                  const showCategoryHeader = sortBy === 'category' && (index === 0 || activeItems[index - 1].category !== item.category);
                  const showStoreHeader = sortBy === 'store' && (index === 0 || activeItems[index - 1].store !== item.store);
                  
                  const elements = [];
                  if (showCategoryHeader) {
                    elements.push(
                      <motion.div 
                        key={`cat-header-${item.category}`}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="col-span-full pt-6 pb-2 mb-1 first:pt-2"
                      >
                        <h3 className="text-[11px] uppercase tracking-[0.25em] font-black text-blue-500/70 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                          {item.category}
                        </h3>
                      </motion.div>
                    );
                  }
                  if (showStoreHeader) {
                    elements.push(
                      <motion.div 
                        key={`store-header-${item.store || 'none'}`}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="col-span-full pt-6 pb-2 mb-1 first:pt-2"
                      >
                        <h3 className="text-[11px] uppercase tracking-[0.25em] font-black text-purple-500/70 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500/40" />
                          {item.store || 'Andre butikker'}
                        </h3>
                      </motion.div>
                    );
                  }
                  elements.push(renderItem(item));
                  return elements;
                })
              )}
            </AnimatePresence>
          </div>

          {/* Completed Items Section */}
          {completedItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 whitespace-nowrap">Færdiggjorte</h2>
                <div className="h-px w-full bg-gray-200" />
              </div>
              <div className={viewMode === 'list' ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
                <AnimatePresence mode="popLayout">
                  {completedItems.map(renderItem)}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {items.some(i => i.completed) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 flex justify-center"
          >
            <button 
              onClick={clearCompleted}
              className="text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-2"
            >
              <History className="w-3 h-3" />
              Overfør færdiggjorte til historik
            </button>
          </motion.div>
        )}
      </>
    ) : activeTab === 'history' ? (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500" />
            Tidligere varer
          </h2>
          <p className="text-sm text-gray-400 mb-6">Her kan du se alle varer du tidligere har tilføjet og hurtigt tilføje dem til din liste igen.</p>
          
          <div className="space-y-3">
            {historyItems.length === 0 ? (
              <div className="py-12 text-center">
                <History className="w-12 h-12 text-gray-100 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Ingen historik endnu</p>
              </div>
            ) : (
              historyItems.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-between p-4 bg-white rounded-[1.8rem] border border-gray-50 hover:border-orange-100 hover:shadow-xl hover:shadow-gray-200/40 transition-all duration-300 group"
                >
                  <div className="min-w-0">
                    <p className="text-base font-bold text-gray-800 truncate mb-1">{item.text}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border shadow-sm ${CATEGORY_COLORS[item.category]?.bg || 'bg-gray-50'} ${CATEGORY_COLORS[item.category]?.text || 'text-gray-600'} border-current/5`}>
                        {item.category}
                      </span>
                      {item.price && (
                        <span className="text-[10px] font-black text-emerald-600">
                          {item.price.toLocaleString('da-DK')} kr.
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => addFromHistory(item)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tilføj
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    ) : activeTab === 'offers' ? (
      <div className="space-y-6">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <TicketPercent className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-display font-black text-gray-900 tracking-tight">Aktuelle Tilbud</h2>
              <p className="text-xs text-gray-400 font-medium">Find de bedste tilbud fra dine yndlingsbutikker.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8">
            {OFFER_STORES.map(store => (
              <button
                key={store.name}
                onClick={() => fetchOffers(store.name)}
                disabled={isSearchingOffers}
                className={`flex flex-col items-center justify-center p-4 rounded-3xl border ${
                  selectedOfferStore === store.name 
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/10' 
                    : 'border-gray-100 hover:border-emerald-100 hover:bg-emerald-50/30'
                } transition-all duration-300 group`}
              >
                <div className={`w-10 h-10 ${store.color} rounded-xl shadow-sm mb-2 flex items-center justify-center font-black text-xs ${store.text} group-hover:scale-110 transition-transform`}>
                  {store.name[0]}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 text-center">{store.name}</span>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {isSearchingOffers ? (
              <div className="py-20 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="font-bold text-gray-900">Henter tilbud...</p>
                  <p className="text-xs text-gray-400">Vi gennemsøger aviserne for dig</p>
                </div>
              </div>
            ) : offers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map((offer, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-200/20 transition-all duration-500 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${CATEGORY_COLORS[offer.category]?.bg || 'bg-gray-50'} ${CATEGORY_COLORS[offer.category]?.text || 'text-gray-600'}`}>
                          {offer.category || 'Tilbud'}
                        </span>
                        <div className="text-right">
                          <p className="text-xl font-display font-black text-emerald-600 leading-none">{offer.price} kr.</p>
                          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1">{offer.quantity}</p>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2 group-hover:text-emerald-600 transition-colors uppercase">{offer.text}</h3>
                    </div>
                    <button
                      onClick={() => addOfferToList(offer)}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tilføj til liste
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : selectedOfferStore ? (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100/50">
                  <Search className="w-8 h-8 text-gray-200" />
                </div>
                <p className="text-gray-400 text-sm">Ingen tilbud fundet i denne uge.</p>
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100/50">
                  <TicketPercent className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-gray-900">Vælg en butik</p>
                  <p className="text-xs text-gray-400">Klik på en butik ovenfor for at se deres aktuelle avistilbud</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    ) : (
      <div className="space-y-8">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-display font-black text-gray-900 tracking-tight">Indstillinger</h2>
              <p className="text-xs text-gray-400 font-medium">Gør indkøbslisten helt din egen.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Categories Management */}
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Dine Kategorier</h3>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Ny kategori..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 transition-all outline-none"
                />
                <button 
                  onClick={addCategory}
                  className="p-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {userCategories.map(cat => {
                   const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS["Andet"];
                   return (
                    <div key={cat} className={`flex items-center gap-2 ${colors.bg} ${colors.text} px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-current/10 group`}>
                      {cat}
                      {!CATEGORIES.includes(cat) && (
                        <button 
                          onClick={() => removeCategory(cat)}
                          className="text-current opacity-30 hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stores Management */}
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Dine Butikker</h3>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Ny butik..."
                  value={newStore}
                  onChange={(e) => setNewStore(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 transition-all outline-none"
                />
                <button 
                  onClick={addStore}
                  className="p-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {userStores.map(store => (
                  <div key={store} className="flex items-center gap-2 bg-gray-100 text-gray-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-200 group">
                    {store}
                    <button 
                      onClick={() => removeStore(store)}
                      className="text-gray-400 hover:text-red-500 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Functionality */}
            <div className="space-y-6 col-span-full pt-10 border-t border-gray-50">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 px-1">Send som mail</h3>
              <div className="bg-emerald-50/50 rounded-[2rem] p-8 border border-emerald-100/50 flex flex-col sm:flex-row items-center justify-between gap-6 hover:shadow-xl hover:shadow-emerald-200/20 transition-all duration-500">
                <div>
                  <h4 className="text-lg font-display font-black text-emerald-900 mb-1">Del listen hurtigt</h4>
                  <p className="text-sm text-emerald-700/70 font-medium">Send din aktuelle indkøbsliste direkte til en e-mail adresse.</p>
                </div>
                <button 
                  onClick={sendListByEmail}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  Send nu
                </button>
              </div>
            </div>

            {/* List Management */}
            <div className="space-y-6 col-span-full pt-10 border-t border-gray-50">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 px-1">Dine lister</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userLists.map(list => (
                  <div key={list.id} className="relative group">
                    <button
                      onClick={() => switchList(list.id)}
                      className={`w-full p-6 rounded-[2rem] border-2 text-left transition-all duration-300 ${
                        activeListId === list.id 
                          ? 'bg-blue-50 border-blue-200 shadow-xl shadow-blue-100/50 scale-[1.02]' 
                          : 'bg-white border-gray-50 hover:border-blue-100 hover:shadow-lg hover:shadow-gray-200/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 pr-6">
                        {editingListId === list.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={editingListName}
                            onChange={(e) => setEditingListName(e.target.value)}
                            onBlur={() => saveListName(list.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveListName(list.id);
                              if (e.key === 'Escape') setEditingListId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-base font-bold bg-white border-2 border-blue-400 rounded-xl px-3 py-1.5 w-full focus:ring-4 focus:ring-blue-500/10 outline-none"
                          />
                        ) : (
                          <span className={`text-base font-black tracking-tight truncate ${activeListId === list.id ? 'text-blue-900' : 'text-gray-900'}`}>
                            {list.name}
                          </span>
                        )}
                        {activeListId === list.id && !editingListId && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <Users className="w-3 h-3" />
                        {list.members.length} {list.members.length === 1 ? 'medlem' : 'medlemmer'}
                      </div>
                    </button>
                    
                    {list.ownerId === user?.uid && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            startRenamingList(list.id, list.name);
                          }}
                          className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-all"
                          title="Omdøb liste"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteList(list.id, list.name);
                          }}
                          className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-lg text-gray-400 hover:text-red-500 transition-all"
                          title="Slet liste"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={createNewList}
                  className="p-4 rounded-2xl border border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2 text-sm font-medium text-gray-400 hover:text-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  Ny liste
                </button>
              </div>
            </div>

            {/* Sharing Section */}
            <div className="space-y-4 col-span-full pt-8 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Del denne liste</h3>
              <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100/50">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-blue-700 mb-2 uppercase tracking-wider">Inviter via e-mail</label>
                    <div className="flex gap-2">
                      <input 
                        type="email"
                        placeholder="familie@eksempel.dk"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-white border border-blue-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                      <button 
                        onClick={inviteUser}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                      >
                        Inviter
                      </button>
                    </div>
                  </div>
                </div>
                
                {activeList && activeList.invitedEmails.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Afventer invitation</h4>
                    <div className="flex flex-wrap gap-2">
                      {activeList.invitedEmails.map(email => (
                        <div key={email} className="px-3 py-1.5 bg-white border border-blue-50 rounded-lg text-xs text-gray-500 flex items-center gap-2 group">
                          {email}
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse group-hover:hidden" />
                          <button 
                            onClick={() => removeInvitation(email)}
                            className="hidden group-hover:block text-gray-400 hover:text-red-500 transition-colors"
                            title="Fjern invitation"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8 text-center">
        <p className="text-[10px] text-gray-300 font-mono tracking-widest uppercase opacity-50 hover:opacity-100 transition-opacity cursor-default select-none">
          v1.3.2
        </p>
      </div>

      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Send liste som mail</h3>
                    <p className="text-xs text-gray-500">{activeList?.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowEmailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Modtagerens e-mail</label>
                  <input 
                    type="email"
                    placeholder="familie@eksempel.dk"
                    value={emailToSend}
                    onChange={(e) => setEmailToSend(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>

                {emailStatus === 'success' && (
                  <div className="p-4 bg-green-50 text-green-700 rounded-2xl text-sm font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Listen er sendt afsted!
                  </div>
                )}

                {emailStatus === 'error' && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-medium flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Der skete en fejl. Prøv igen senere.
                  </div>
                )}

                <button 
                  onClick={confirmSendEmail}
                  disabled={isSendingEmail || !emailToSend.trim() || emailStatus === 'success'}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sender...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send nu
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Del liste</h3>
                    <p className="text-xs text-gray-500">{activeList?.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inviter via e-mail</label>
                  <div className="flex gap-2">
                    <input 
                      type="email"
                      placeholder="familie@eksempel.dk"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                    <button 
                      onClick={inviteUser}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
                    >
                      Inviter
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Medlemmer</label>
                  <div className="space-y-2">
                    {activeList?.members.map(memberId => {
                      const profile = memberProfiles[memberId];
                      const isOnline = profile && (Date.now() - profile.lastSeen < 120000); // 2 minutes

                      return (
                        <div key={memberId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-100 relative">
                            {profile?.photoURL ? (
                              <img src={profile.photoURL} alt="" className="w-full h-full rounded-lg object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <UserIcon className="w-4 h-4 text-gray-400" />
                            )}
                            {isOnline && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-700 truncate">
                              {profile?.displayName || (memberId === user?.uid ? 'Dig' : 'Indlæser...')}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {profile?.email || memberId}
                            </p>
                          </div>
                          {memberId === activeList.ownerId && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">EJER</span>
                          )}
                        </div>
                      );
                    })}
                    {activeList?.invitedEmails.map(email => (
                      <div key={email} className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 group">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-100">
                          <Mail className="w-4 h-4 text-gray-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-400 truncate">{email}</span>
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded group-hover:hidden">AFVENTER</span>
                          <button 
                            onClick={() => removeInvitation(email)}
                            className="hidden group-hover:flex items-center justify-center w-6 h-6 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                            title="Fjern invitation"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Image Preview Modal */}
        {previewImageUrl && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewImageUrl(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative z-10 max-w-2xl w-full aspect-square bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setPreviewImageUrl(null)}
                className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              <img 
                src={previewImageUrl} 
                alt="Billede preview" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
