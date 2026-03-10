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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Status Banner - MD3 Surface */}
      <section className="bg-slate-900 dark:bg-slate-900 text-white rounded-xl p-5 shadow-sm overflow-hidden relative border border-white/5 dark:border-slate-800">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Live Safety Status</h2>
            {isScanning && (
              <div className="flex items-center gap-2 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                <Zap className="w-3 h-3 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Deep Scanning</span>
              </div>
            )}
          </div>
          <p className="text-xl font-medium leading-tight tracking-tight">
            {isScanning
              ? "ShieldGuide is performing a deep security scan of your immediate vicinity..."
              : !isLocationEnabled
                ? "Location tracking is currently disabled. Enable it for real-time risk monitoring."
                : location.coords
                  ? "Your live location is being monitored. ShieldGuide is scanning for nearby risks."
                  : location.error
                    ? `Location Error: ${location.error}`
                    : "Establishing secure location link..."}
          </p>
          {!isLocationEnabled && !isScanning && (
            <button
              onClick={() => setIsLocationEnabled(true)}
              className="mt-5 px-5 py-2.5 bg-white text-slate-900 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-100 transition-all active:scale-95"
            >
              <Locate className="w-4 h-4" />
              Enable Tracking
            </button>
          )}
        </div>
        <div className="absolute -right-6 -bottom-6 opacity-10">
          <Shield className="w-40 h-40" />
        </div>
      </section>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 gap-4">
        {/* Safety Rating Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Safety Rating</h3>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">8.4</span>
              <div className="flex text-emerald-500">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 opacity-30" />
              </div>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">High Safety Zone</p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin-slow flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
          </div>
        </div>

        {/* Emergency Contacts Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-red-500" />
              Local Emergency Contacts
            </h3>
            <button
              onClick={() => setShowEmergencyContacts(true)}
              className="text-xs font-bold text-primary-600 dark:text-primary-400"
            >
              View Global List
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900/30 group active:scale-95 transition-all">
              <div className="p-2 bg-red-500 text-white rounded-lg">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-red-400 uppercase">Police</p>
                <p className="text-sm font-bold text-red-700 dark:text-red-300">112</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-950/30 rounded-xl border border-primary-100 dark:border-primary-900/30 group active:scale-95 transition-all">
              <div className="p-2 bg-primary-500 text-white rounded-lg">
                <Activity className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-primary-400 uppercase">Medical</p>
                <p className="text-sm font-bold text-primary-700 dark:text-primary-300">102</p>
              </div>
            </button>
          </div>
        </div>

        {/* Safe Havens Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-500" />
              Nearby Safe Havens
            </h3>
          </div>
          <div className="space-y-3">
            {[
              { name: "Central Police Station", dist: "0.4 km", type: "Police" },
              { name: "St. Mary's Hospital", dist: "1.2 km", type: "Hospital" },
              { name: "Tourist Info Center", dist: "0.8 km", type: "Support" }
            ].map((haven, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm">
                    <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{haven.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{haven.type} • {haven.dist}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <section className="grid grid-cols-2 gap-3">
        {quickActions.map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className="flex flex-col items-start p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all group active:scale-95"
          >
            <div className={`p-2 rounded-lg ${item.color} mb-3 group-hover:scale-110 transition-transform`}>
              {item.icon}
            </div>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.label}</span>
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

      <div className="space-y-4 min-h-[400px]">
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
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i} className="mb-2 last:mb-0">{line}</p>
                  ))}
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
          <h2 className="text-xl font-bold text-slate-900">Interactive Safety Map</h2>
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
              Live Safety Map
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-md relative">
          <User className="w-12 h-12 text-slate-400 dark:text-slate-500" />
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{user?.name || 'Traveler Profile'}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{user?.email}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{user?.phone}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {[
          { icon: <History className="w-5 h-5" />, label: "History", count: "12 Reports" },
          { icon: <ShieldCheck className="w-5 h-5" />, label: "Visited Locations", count: "45 Saved" },
          { icon: <MessageSquare className="w-5 h-5" />, label: "Feedback", count: "Help us improve", action: () => setShowFeedback(true) },
          { icon: <Settings className="w-5 h-5" />, label: "Preferences", count: "Configured", action: () => setShowSettings(true) },
          { icon: <Info className="w-5 h-5" />, label: "About ShieldGuide", count: "v2.5.0" }
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 border-b last:border-0 border-slate-100 dark:border-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="text-slate-400 dark:text-slate-500">{item.icon}</div>
              <span className="font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{item.count}</span>
              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl font-bold border border-red-100 dark:border-red-900/30 active:scale-95 transition-all flex items-center justify-center gap-2"
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
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 z-50 transition-colors shadow-lg">
        <div className="flex items-center gap-3 mb-10">
          <div className={`p-2 rounded-xl bg-slate-900 text-white ${isEmergencyPulse ? 'emergency-pulse' : ''}`}>
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">ShieldGuide</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isLocationEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className="text-[9px] uppercase font-black tracking-[0.15em] text-slate-500">
                {isLocationEnabled ? 'Active Monitoring' : 'Standby'}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'home', icon: <Home className="w-5 h-5" />, label: 'Home Dashboard' },
            { id: 'maps', icon: <MapIcon className="w-5 h-5" />, label: 'Safety Map' },
            { id: 'alerts', icon: <ShieldAlert className="w-5 h-5" />, label: 'Intelligence' },
            { id: 'profile', icon: <User className="w-5 h-5" />, label: 'Traveler Profile' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === tab.id
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
          >
            <Settings className="w-5 h-5" />
            Preferences
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative w-full h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-50 glass-panel px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-slate-900 text-white ${isEmergencyPulse ? 'emergency-pulse' : ''}`}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">ShieldGuide</h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isLocationEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span className="text-[9px] uppercase font-black tracking-[0.15em] text-slate-500">
                  {isLocationEnabled ? 'Active Monitoring' : 'Standby'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-90 text-slate-600 dark:text-slate-400"
            >
              <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
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
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-t-[32px] p-8 z-[70] shadow-2xl h-[85vh] overflow-y-auto"
              >
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-8" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Global Emergency Directory</h2>

                <div className="space-y-8">
                  {/* Indian Contacts Section */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Flag className="w-5 h-5 text-orange-500" />
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">India Emergency Services</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {INDIAN_EMERGENCY_CONTACTS.map((contact, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{contact.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{contact.type}</p>
                          </div>
                          <a href={`tel:${contact.number}`} className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold text-sm active:scale-95 transition-all">
                            {contact.number}
                          </a>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* International Contacts Section */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Globe className="w-5 h-5 text-primary-500" />
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">International Directory</h3>
                    </div>
                    <div className="space-y-6">
                      {Object.entries(INTERNATIONAL_EMERGENCY_CONTACTS).map(([region, contacts]) => (
                        <div key={region} className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{region}</h4>
                          <div className="grid grid-cols-1 gap-3">
                            {contacts.map((contact, i) => (
                              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div>
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{contact.name}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{contact.type}</p>
                                </div>
                                <a href={`tel:${contact.number}`} className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold text-sm active:scale-95 transition-all">
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
      </div>
    </div>
  );
}


