import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  AlertTriangle,
  MapPin,
  Navigation as NavIcon,
  PhoneCall,
  Settings,
  History,
  Info,
  ChevronRight,
  Search,
  Zap,
  Bell,
  Locate,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Home,
  Map as MapIcon,
  User,
  ShieldAlert,
  Activity,
  HeartPulse,
  Building2,
  Star,
  Moon,
  Sun,
  MessageSquare,
  Globe,
  Flag,
  LogOut,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatWithShieldGuide } from './services/gemini';
import { Message, LocationState, SafetyAlert, User as UserType } from './types';
import Auth from './components/Auth';
import MapComponent from './components/MapComponent';
import { INDIAN_EMERGENCY_CONTACTS, INTERNATIONAL_EMERGENCY_CONTACTS } from './constants/emergencyContacts';
import { useTheme } from './theme/ThemeContext';

export default function App() {
  const { themeMode, setThemeMode, primaryColor, setPrimaryColor } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [scamAlerts, setScamAlerts] = useState<SafetyAlert[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [user, setUser] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('shieldguide_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [location, setLocation] = useState<LocationState>({ coords: null });
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({ type: 'experience', message: '' });
  const [isEmergencyPulse, setIsEmergencyPulse] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'maps' | 'alerts' | 'profile'>('home');
  const [showHistory, setShowHistory] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const fetchChatHistory = async (email: string) => {
    try {
      const response = await fetch(`/api/chat/${email}`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    }
  };

  const handleLogin = (userData: UserType) => {
    setUser(userData);
    localStorage.setItem('shieldguide_user', JSON.stringify(userData));
    fetchChatHistory(userData.email);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('shieldguide_user');
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLocationEnabled) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setLocation({
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            }
          });
        },
        (err) => {
          setLocation(prev => ({ ...prev, error: err.message }));
        },
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isLocationEnabled]);

  useEffect(() => {
    if (user) {
      fetchChatHistory(user.email);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    e?.preventDefault();
    const messageText = customPrompt || input;
    if (!messageText.trim() || isLoading) return;

    // Switch to alerts tab if it's a safety query
    if (activeTab !== 'alerts') setActiveTab('alerts');

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    const saveMessage = async (msg: Message) => {
      if (!user) return;
      try {
        await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            groundingMetadata: msg.groundingMetadata
          })
        });
      } catch (error) {
        console.error('Failed to save message:', error);
      }
    };

    try {
      await saveMessage(userMessage);
      const response = await chatWithShieldGuide(messageText, messages, location.coords);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        groundingMetadata: response.groundingMetadata
      };
      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage(assistantMessage);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting to my safety database. Please try again or check your connection.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    {
      icon: <PhoneCall className="w-5 h-5" />,
      label: "Emergency SOS",
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      action: () => {
        setIsEmergencyPulse(true);
        setShowEmergencyContacts(true);
      }
    },
    { icon: <ShieldCheck className="w-5 h-5" />, label: "Safe Landmarks", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", action: () => handleSendMessage(undefined, "What are some verified safe landmarks near me?") },
    {
      icon: <AlertTriangle className="w-5 h-5" />, label: "Report Scam", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", action: () => {
        setIsScanning(true);
        handleSendMessage(undefined, "DEEP SCAN: Identify active scams in this area, specifically looking for: 1) Overcharging or extra money charges at local destinations/restaurants, 2) Taxis or transport taking long routes to increase fares, and 3) Any other recent tourist traps. Use real-time search for the latest alerts.");
        setTimeout(() => setIsScanning(false), 3000);
      }
    },
    { icon: <NavIcon className="w-5 h-5" />, label: "Safe Route", color: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400", action: () => handleSendMessage(undefined, "Suggest a safe, well-lit route to my destination.") },
  ];

  const renderHome = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Status Banner - Premium Charcoal/Lavender */}
      <section className="bg-charcoal text-white rounded-[24px] p-8 shadow-xl overflow-hidden relative border border-white/10">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-lavender-grey opacity-80">System Security Pulse</h2>
            {isScanning && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white/10 text-white rounded-full border border-white/20 backdrop-blur-md">
                <Zap className="w-3 h-3 animate-pulse text-periwinkle-light" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Deep Scanning Active</span>
              </div>
            )}
          </div>
          <p className="text-2xl font-semibold leading-tight tracking-tight max-w-md">
            {isScanning
              ? "ShieldGuide is performing a deep high-precision security scan of your surroundings..."
              : !isLocationEnabled
                ? "Secure tracking is paused. Enable real-time monitoring for maximum safety."
                : location.coords
                  ? "ShieldGuide is active. We are currently monitoring your perimeter for any risks."
                  : location.error
                    ? `Encrypted Location Error: ${location.error}`
                    : "Synchronizing secure location uplink..."}
          </p>
          {!isLocationEnabled && !isScanning && (
            <button
              onClick={() => setIsLocationEnabled(true)}
              className="mt-6 px-6 py-3 bg-deep-periwinkle text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-deep-periwinkle/90 transition-all active:scale-95 shadow-lg shadow-deep-periwinkle/20"
            >
              <Locate className="w-4 h-4" />
              Initialize Tracking
            </button>
          )}
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-5">
          <Shield className="w-64 h-64" />
        </div>
      </section>

      {/* Dashboard Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Safety Rating - Frosted Glass */}
        <div className="frosted-glass p-6 rounded-[24px] flex items-center justify-between group hover:border-white/80 transition-all duration-500">
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-charcoal/40 dark:text-white/40 uppercase tracking-widest">Environment Safety</h3>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black text-charcoal dark:text-white">8.4</span>
              <div className="flex text-deep-periwinkle dark:text-periwinkle-light">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 opacity-20" />
              </div>
            </div>
            <p className="text-xs font-bold text-deep-periwinkle/70 dark:text-periwinkle-light/70 uppercase tracking-tight">Verified Secure Zone</p>
          </div>
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-[3px] border-deep-periwinkle border-t-transparent animate-spin-slow" />
            <ShieldCheck className="w-8 h-8 text-deep-periwinkle absolute inset-0 m-auto" />
          </div>
        </div>

        {/* Emergency Pulse Card */}
        <div className="frosted-glass p-6 rounded-[24px] group hover:border-white/80 transition-all duration-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-bold text-charcoal/40 dark:text-white/40 uppercase tracking-widest flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-red-500 animate-pulse" />
              Instant Response
            </h3>
            <button
              onClick={() => setShowEmergencyContacts(true)}
              className="text-[9px] font-black text-deep-periwinkle dark:text-periwinkle-light uppercase tracking-widest hover:underline"
            >
              View Global List
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col gap-1 p-4 bg-red-100/50 hover:bg-red-100 border border-red-200/50 rounded-2xl transition-all active:scale-95">
              <span className="text-[9px] font-black text-red-500/60 uppercase">Police</span>
              <span className="text-lg font-black text-red-600">112</span>
            </button>
            <button className="flex flex-col gap-1 p-4 bg-deep-periwinkle/10 hover:bg-deep-periwinkle/20 border border-deep-periwinkle/20 rounded-2xl transition-all active:scale-95">
              <span className="text-[9px] font-black text-deep-periwinkle/60 uppercase">Medic</span>
              <span className="text-lg font-black text-deep-periwinkle">102</span>
            </button>
          </div>
        </div>

        {/* Safe Havens List - Frosted Glass */}
        <div className="md:col-span-2 frosted-glass p-6 rounded-[24px] group hover:border-white/80 transition-all duration-500">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-bold text-charcoal/40 dark:text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-4 h-4 text-deep-periwinkle dark:text-periwinkle-light" />
              Nearby Secure Points
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "City Security HQ", dist: "0.4 km", type: "Official" },
              { name: "Apex Medical Care", dist: "1.2 km", type: "Health" },
              { name: "Tourist Support", dist: "0.8 km", type: "Info" }
            ].map((haven, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/30 dark:bg-white/5 rounded-2xl border border-white/40 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/10 hover:border-white/60 dark:hover:border-white/20 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/60 dark:bg-white/10 rounded-xl flex items-center justify-center shadow-sm">
                    <MapPin className="w-4 h-4 text-charcoal/40 dark:text-white/40" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-charcoal dark:text-white">{haven.name}</p>
                    <p className="text-[9px] text-charcoal/40 dark:text-white/40 font-bold uppercase tracking-wider">{haven.dist} • {haven.type}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-charcoal/20 dark:text-white/20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions - Floating Dots Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {quickActions.map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className="group flex flex-col items-center justify-center p-6 rounded-[24px] bg-white text-center hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border border-lavender-light"
          >
            <div className={`p-4 rounded-full bg-slate-50 mb-3 group-hover:scale-110 group-hover:bg-deep-periwinkle group-hover:text-white transition-all duration-500 text-charcoal/60`}>
              {item.icon}
            </div>
            <span className="font-bold text-[11px] uppercase tracking-wider text-charcoal/80">{item.label}</span>
          </button>
        ))}
      </section>
    </div>
  );

  const renderAlerts = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          Safety Intelligence
        </h2>
        <button
          onClick={() => setMessages([])}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-wider"
        >
          Clear History
        </button>
      </div>

      <div className="space-y-4 min-h-[400px] pb-44 md:pb-36">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center">
              <Shield className="w-10 h-10 text-slate-300 dark:text-slate-700" />
            </div>
            <div className="max-w-xs">
              <p className="text-slate-500 dark:text-slate-400 font-medium">No active alerts or queries. Use the "Report Scam" button or ask me about safety in your current area.</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] rounded-xl p-4 ${msg.role === 'user'
                ? 'bg-slate-900 dark:bg-primary-600 text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm'
                }`}>
                <div className="prose prose-sm max-w-none prose-slate dark:prose-invert">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 my-3 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-3" {...props} />,
                      li: ({node, ...props}) => <li {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-slate-950 dark:text-white" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {msg.groundingMetadata?.groundingChunks && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Verified Sources</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.groundingMetadata.groundingChunks.map((chunk: any, idx: number) => (
                        chunk.maps && (
                          <a
                            key={idx}
                            href={chunk.maps.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <MapPin className="w-3 h-3" />
                            {chunk.maps.title || 'View on Maps'}
                            <ExternalLink className="w-2 h-2" />
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Scanning Risks...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );

  const renderMaps = () => (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {!showMap ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
          <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center">
            <MapIcon className="w-12 h-12 text-primary-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Interactive Map</h2>
          <p className="text-slate-500 max-w-xs">The smart safety map combines verified tourist destinations, safety alerts, and secure travel routes to help visitors explore locations safely.</p>
          <button
            onClick={() => {
              if (!isLocationEnabled) setIsLocationEnabled(true);
              setShowMap(true);
            }}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-200 active:scale-95 transition-all"
          >
            Launch Map View
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-primary-500" />
              Live Map
            </h2>
            <button
              onClick={() => setShowMap(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider"
            >
              Close Map
            </button>
          </div>
          <div className="flex-1 min-h-[400px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
            <MapComponent center={location.coords} />
          </div>
          <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
            <p className="text-xs text-primary-700 font-medium leading-relaxed">
              <span className="font-bold">Pro Tip:</span> Green zones indicate high-safety areas with active ShieldGuide monitoring and verified safe havens.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-2xl mx-auto">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="ai-aura">
          <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-xl relative overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-14 h-14 text-charcoal/20" />
            )}
          </div>
          <div className="absolute bottom-1 right-1 w-7 h-7 bg-emerald-500 border-4 border-white rounded-full shadow-sm" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-charcoal dark:text-white tracking-tight">{user?.name || 'Traveler Profile'}</h2>
          <p className="text-sm text-charcoal/40 dark:text-white/40 font-bold uppercase tracking-[0.2em] mt-1">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { 
            icon: <History className="w-5 h-5 stroke-[1.5px]" />, 
            label: "History", 
            count: `${messages.filter(m => m.role === 'user').length} Searches`,
            action: () => setShowHistory(true)
          },
          { icon: <ShieldCheck className="w-5 h-5 stroke-[1.5px]" />, label: "Visited Locations", count: "45 Saved" },
          { icon: <MessageSquare className="w-5 h-5 stroke-[1.5px]" />, label: "Share Feedback", count: "Help improve", action: () => setShowFeedback(true) },
          { icon: <Settings className="w-5 h-5 stroke-[1.5px]" />, label: "Preferences", count: "Configured", action: () => setShowSettings(true) },
          { icon: <Info className="w-5 h-5 stroke-[1.5px]" />, label: "About ShieldGuide", count: "v2.5.0" }
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className="w-full flex items-center justify-between p-5 frosted-glass rounded-[18px] hover:bg-white/60 transition-all duration-300 group border border-white/40"
          >
            <div className="flex items-center gap-4">
              <div className="text-charcoal dark:text-white/70 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
              <span className="font-bold text-charcoal/80 dark:text-white/80 text-sm tracking-tight">{item.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-charcoal/30 dark:text-white/30 uppercase tracking-widest">{item.count}</span>
              <ChevronRight className="w-4 h-4 text-charcoal/20 dark:text-white/20 group-hover:text-charcoal/40 dark:group-hover:text-white/40 group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-5 bg-deep-periwinkle text-white rounded-[18px] font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-deep-periwinkle/30 hover:bg-deep-periwinkle/90 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3"
      >
        <LogOut className="w-5 h-5" />
        Logout
      </button>
    </div>
  );

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300 w-full overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-lavender-grey border-r border-lavender-light p-6 z-50 transition-colors shadow-none">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2 rounded-xl bg-charcoal text-white">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-charcoal">ShieldGuide</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isLocationEnabled ? 'bg-emerald-500' : 'bg-charcoal/30'}`} />
              <span className="text-[9px] uppercase font-black tracking-[0.15em] text-charcoal/60">
                {isLocationEnabled ? 'Active Monitoring' : 'Standby'}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'home', icon: <Home className="w-5 h-5 stroke-[1.5px]" />, label: 'Home' },
            { id: 'maps', icon: <MapIcon className="w-5 h-5 stroke-[1.5px]" />, label: 'Maps' },
            { id: 'alerts', icon: <ShieldAlert className="w-5 h-5 stroke-[1.5px]" />, label: 'Alerts' },
            { id: 'profile', icon: <User className="w-5 h-5 stroke-[1.5px]" />, label: 'Profile' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === tab.id
                ? 'bg-white/50 text-charcoal shadow-sm'
                : 'text-charcoal/60 hover:bg-white/30'
                }`}
            >
              <span className={activeTab === tab.id ? 'text-charcoal' : 'text-charcoal/60'}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-2 text-charcoal/60">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm hover:bg-white/30"
          >
            <Settings className="w-5 h-5" />
            Preferences
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative w-full h-screen overflow-hidden mesh-gradient">
        {/* Header - Unified for Desktop & Mobile */}
        <header className="sticky top-0 z-50 bg-white px-6 py-4 flex items-center justify-between border-b border-lavender-light shadow-sm">
          <div className="flex items-center gap-3">
            <div className="md:hidden p-2 rounded-xl bg-charcoal text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div className="hidden md:block">
              {/* Logo placeholder if needed, or just breadcrumbs/title */}
              <span className="text-xs font-bold uppercase tracking-widest text-charcoal/40">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-charcoal">{user?.name || "User"}</p>
              <p className="text-[10px] text-charcoal/50 font-medium">Verified Traveler</p>
            </div>
            <div className="ai-aura">
              <div className="w-10 h-10 bg-lavender-light rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-charcoal" />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 pb-28 md:pb-8 md:px-10 lg:px-12 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-5xl mx-auto h-full space-y-8">
            {activeTab === 'home' && renderHome()}
            {activeTab === 'maps' && renderMaps()}
            {activeTab === 'alerts' && renderAlerts()}
            {activeTab === 'profile' && renderProfile()}
          </div>
        </main>

        {/* Bottom Navigation Bar - Mobile Only */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-6 py-3 z-50 transition-colors">
          <div className="flex items-center justify-between">
            {[
              { id: 'home', icon: <Home className="w-6 h-6" />, label: 'Home' },
              { id: 'maps', icon: <MapIcon className="w-6 h-6" />, label: 'Maps' },
              { id: 'alerts', icon: <ShieldAlert className="w-6 h-6" />, label: 'Alerts' },
              { id: 'profile', icon: <User className="w-6 h-6" />, label: 'Profile' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center gap-1 relative transition-all duration-300 ${activeTab === tab.id ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                  }`}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-300 ${activeTab === tab.id ? 'bg-slate-100 dark:bg-slate-800 scale-110' : ''
                  }`}>
                  {tab.icon}
                </div>
                <span className={`text-[10px] font-bold tracking-wide transition-all ${activeTab === tab.id ? 'opacity-100' : 'opacity-0'
                  }`}>
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1 w-1 h-1 bg-slate-900 dark:bg-white rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Chat Input - Only on Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="fixed bottom-20 left-0 right-0 max-w-2xl mx-auto px-6 z-40">
            <form onSubmit={handleSendMessage} className="relative shadow-xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about safety or report a scam..."
                className="w-full pl-5 pr-14 py-4 bg-white dark:bg-slate-900 border-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-blue-600 transition-all font-medium placeholder:text-slate-400 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-2 p-2.5 bg-slate-900 dark:bg-blue-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </form>
          </div>
        )}

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)}
                className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-t-[32px] p-8 z-[70] shadow-2xl"
              >
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-8" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Safety Preferences</h2>

                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200">Live Location Tracking</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Allow real-time position monitoring.</p>
                    </div>
                    <button
                      onClick={() => setIsLocationEnabled(!isLocationEnabled)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${isLocationEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isLocationEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200">Emergency SOS Pulse</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Visual feedback for SOS actions.</p>
                    </div>
                    <button
                      onClick={() => setIsEmergencyPulse(!isEmergencyPulse)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${isEmergencyPulse ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isEmergencyPulse ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="pt-6">
                    <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mb-6" />

                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Theme Mode</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Select your preferred appearance.</p>
                      </div>
                      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                        {(['light', 'dark', 'system'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setThemeMode(mode)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${themeMode === mode ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Accent Color</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Personalize dashboard color theme.</p>
                      </div>
                      <div className="flex gap-3">
                        {(['blue', 'green', 'purple', 'orange', 'red'] as const).map((color) => {
                          const bgMap: Record<string, string> = {
                            blue: '#3b82f6',
                            green: '#10b981',
                            purple: '#8b5cf6',
                            orange: '#f97316',
                            red: '#f43f5e'
                          };
                          const hexStr = bgMap[color];

                          return (
                            <button
                              key={color}
                              onClick={() => setPrimaryColor(color)}
                              title={`Switch to ${color} theme`}
                              style={{ backgroundColor: hexStr }}
                              className={`w-8 h-8 rounded-full transition-all ${primaryColor === color ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110 shadow-lg' : 'hover:scale-105 hover:shadow-md'} dark:ring-offset-slate-900`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowSettings(false)}
                      className="w-full py-4 text-white rounded-xl font-bold transition-all active:scale-95 bg-primary-600 hover:bg-primary-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Emergency Contacts Modal */}
        <AnimatePresence>
          {showEmergencyContacts && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowEmergencyContacts(false)}
                className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto frosted-glass rounded-t-[40px] p-10 z-[70] shadow-2xl h-[85vh] overflow-y-auto border-t border-white/60"
              >
                <div className="w-12 h-1.5 bg-charcoal/10 rounded-full mx-auto mb-10" />

                <div className="text-center mb-12">
                  <h2 className="text-3xl font-black text-charcoal tracking-tight mb-2">Emergency Hub</h2>
                  <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-[0.3em]">Verified Global Assistance Network</p>
                </div>

                <div className="space-y-12">
                  {/* Indian Emergency Module */}
                  <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <div className="flex items-center justify-between mb-6 px-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-xl">
                          <Flag className="w-5 h-5 text-orange-600" />
                        </div>
                        <h3 className="font-black text-charcoal text-lg tracking-tight">Indian Emergency Module</h3>
                      </div>
                      <span className="text-[9px] font-black text-orange-600/40 uppercase tracking-widest">Region: IN</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {INDIAN_EMERGENCY_CONTACTS.map((contact, i) => (
                        <div key={i} className="flex items-center justify-between p-5 bg-white/40 rounded-2xl border border-white/60 hover:bg-white/60 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/80 rounded-xl flex items-center justify-center shadow-sm text-charcoal/40 group-hover:text-charcoal transition-colors">
                              <PhoneCall className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-charcoal">{contact.name}</p>
                              <p className="text-[10px] text-charcoal/40 font-bold uppercase tracking-wider">{contact.type}</p>
                            </div>
                          </div>
                          <a
                            href={`tel:${contact.number}`}
                            className="bg-charcoal text-white px-5 py-2.5 rounded-xl font-black text-xs tracking-widest hover:bg-charcoal/90 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-charcoal/10"
                          >
                            {contact.number}
                          </a>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* International Directory */}
                  <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    <div className="flex items-center gap-3 mb-8 px-2">
                      <div className="p-2 bg-deep-periwinkle/10 rounded-xl">
                        <Globe className="w-5 h-5 text-deep-periwinkle" />
                      </div>
                      <h3 className="font-black text-charcoal text-lg tracking-tight">International Directory</h3>
                    </div>
                    <div className="space-y-10">
                      {Object.entries(INTERNATIONAL_EMERGENCY_CONTACTS).map(([region, contacts]) => (
                        <div key={region} className="space-y-4">
                          <h4 className="text-[10px] font-black text-charcoal/30 uppercase tracking-[0.2em] px-2">{region}</h4>
                          <div className="grid grid-cols-1 gap-3">
                            {contacts.map((contact, i) => (
                              <div key={i} className="flex items-center justify-between p-5 bg-white/30 rounded-2xl border border-white/40 hover:bg-white/50 transition-all group">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-white/60 rounded-xl flex items-center justify-center shadow-sm text-charcoal/30 group-hover:text-charcoal transition-colors">
                                    <PhoneCall className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-charcoal">{contact.name}</p>
                                    <p className="text-[10px] text-charcoal/30 font-bold uppercase tracking-wider">{contact.type}</p>
                                  </div>
                                </div>
                                <a
                                  href={`tel:${contact.number}`}
                                  className="bg-white text-charcoal border border-charcoal/10 px-5 py-2.5 rounded-xl font-black text-xs tracking-widest hover:bg-white/80 hover:scale-105 active:scale-95 transition-all"
                                >
                                  {contact.number}
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <button
                  onClick={() => setShowEmergencyContacts(false)}
                  className="w-full mt-12 py-5 bg-charcoal text-white rounded-[20px] font-black text-sm uppercase tracking-[0.2em] hover:bg-charcoal/90 transition-all active:scale-95 shadow-xl"
                >
                  Confirm Awareness
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Feedback Modal */}
        <AnimatePresence>
          {showFeedback && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFeedback(false)}
                className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-t-[32px] p-8 z-[70] shadow-2xl"
              >
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-8" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Share Feedback</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">Your experience helps us build a safer world.</p>

                <div className="space-y-6">
                  <div className="flex gap-3">
                    {['experience', 'grievance'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setFeedback({ ...feedback, type })}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm capitalize border transition-all ${feedback.type === type
                          ? 'bg-slate-900 dark:bg-primary-600 text-white border-slate-900 dark:border-primary-600'
                          : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <textarea
                    placeholder={feedback.type === 'experience' ? "Tell us about your journey..." : "Describe your grievance or issue..."}
                    value={feedback.message}
                    onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
                    className="w-full h-40 p-5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-primary-600 transition-all text-slate-900 dark:text-white font-medium resize-none"
                  />

                  <button
                    onClick={async () => {
                      try {
                        await fetch('/api/feedback', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            email: user?.email,
                            type: feedback.type,
                            message: feedback.message
                          })
                        });
                        alert("Thank you for your feedback!");
                        setShowFeedback(false);
                        setFeedback({ type: 'experience', message: '' });
                      } catch (error) {
                        console.error('Feedback error:', error);
                      }
                    }}
                    disabled={!feedback.message.trim()}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Submit Feedback
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* History Modal */}
        <AnimatePresence>
          {showHistory && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowHistory(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto frosted-glass rounded-t-[40px] p-10 z-[70] shadow-2xl h-[85vh] overflow-y-auto border-t border-white/60"
              >
                <div className="w-12 h-1.5 bg-charcoal/10 rounded-full mx-auto mb-10" />
                
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-black text-charcoal tracking-tight mb-2">Search History</h2>
                  <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-[0.3em]">Your Verified Safety Intelligence Queries</p>
                </div>

                <div className="space-y-4">
                  {messages.filter(m => m.role === 'user').length === 0 ? (
                    <div className="text-center py-20 bg-white/20 rounded-3xl border border-white/40">
                      <History className="w-12 h-12 text-charcoal/10 mx-auto mb-4" />
                      <p className="text-charcoal/40 font-bold text-xs uppercase tracking-widest">No history found</p>
                    </div>
                  ) : (
                    messages
                      .filter(m => m.role === 'user')
                      .slice()
                      .reverse()
                      .map((msg, i) => (
                        <div key={i} className="p-5 bg-white/40 rounded-2xl border border-white/60 shadow-sm hover:bg-white/60 transition-all group">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 flex-1">
                              <p className="text-sm font-bold text-charcoal leading-relaxed">{msg.content}</p>
                              <p className="text-[9px] text-charcoal/30 font-black uppercase tracking-widest">
                                {new Date(msg.timestamp).toLocaleDateString()} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <button 
                              onClick={() => {
                                setShowHistory(false);
                                setActiveTab('alerts');
                              }}
                              className="p-2.5 rounded-xl bg-charcoal/5 group-hover:bg-charcoal text-charcoal/30 group-hover:text-white transition-all shadow-sm"
                            >
                              <Search className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                <button
                  onClick={() => setShowHistory(false)}
                  className="w-full mt-12 py-5 bg-charcoal text-white rounded-[20px] font-black text-sm uppercase tracking-[0.2em] hover:bg-charcoal/90 transition-all active:scale-95 shadow-xl"
                >
                  Close History
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


