import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, User, ShieldAlert, Eye, EyeOff, AlertCircle, ChevronDown, Sparkles } from 'lucide-react';
import { loginUser, registerUser, loginWithGoogle } from '../services/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, isMockFirebase } from '../firebase/config';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isMockFirebase) {
      const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '{}');
      const raghavUid = 'mock-uid-raghav';
      if (!mockUsers[raghavUid]) {
        mockUsers[raghavUid] = {
          uid: raghavUid,
          name: 'Raghav',
          email: 'test1@gmail.com',
          password: 'password123',
          role: 'citizen',
          phone: '9876543210',
          location: 'Bengaluru, India',
          uniqueId: 'JS-777777',
          verifiedStatus: 'Verified',
          level: 3,
          xp: 1850,
          nextLevelXp: 2000,
          completedMissions: 5,
          hoursVolunteered: 12,
          reputationScore: 85,
          reputationLevel: 'Local Guide',
          badges: ['First Responder', 'Eagle Eye'],
          preferences: {
            language: 'en',
            theme: 'dark'
          },
          points: 150,
          reportsSubmitted: 4,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('mock_users', JSON.stringify(mockUsers));
      }
    }
  }, []);
  
  // Auth Modes: 'signin' or 'register'
  const [authMode, setAuthMode] = useState('signin');
  
  // Custom dropdown selector states
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [activeRole, setActiveRole] = useState(null); // 'citizen' or 'officer' (for sign-in dropdown)

  // Password eye visibility toggles
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Form Fields: Sign In
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Form Fields: Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('citizen'); // 'citizen' or 'officer'
  const [regDept, setRegDept] = useState('Parks & Recreation');

  // Interaction Statuses
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (role) => {
    setActiveRole(role);
    setRoleDropdownOpen(false);
    setError('');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!signInEmail || !signInPassword) {
      setError('Please fill in all sign-in credentials.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Authenticate via Firebase Auth
      const firebaseUser = await loginUser(signInEmail, signInPassword);
      
      if (isMockFirebase) {
        const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '{}');
        const profile = mockUsers[firebaseUser.uid];
        
        if (profile) {
          const actualRole = profile.role || 'citizen';
          if (actualRole !== activeRole) {
            setError(`Access Denied: The credentials entered do not belong to a ${activeRole === 'officer' ? 'Government Officer' : 'Citizen Volunteer'}.`);
            setLoading(false);
            return;
          }
          if (actualRole === 'officer') {
            navigate('/officer-dashboard');
          } else {
            navigate('/citizen-dashboard');
          }
        } else {
          if (activeRole !== 'citizen') {
            setError(`Access Denied: The credentials entered do not belong to a Government Officer.`);
            setLoading(false);
            return;
          }
          navigate('/citizen-dashboard');
        }
        return;
      }

      // Fetch profile metadata from Firestore to determine role redirect
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const profile = userDoc.data();
        
        // Cache user details in local storage to keep state synchronized
        const activeProfile = { uid: firebaseUser.uid, email: firebaseUser.email, ...profile };
        localStorage.setItem('mock_current_user', JSON.stringify(activeProfile));
        window.dispatchEvent(new Event('mock-auth-state-change'));

        const actualRole = profile.role || 'citizen';
        if (actualRole !== activeRole) {
          setError(`Access Denied: The credentials entered do not belong to a ${activeRole === 'officer' ? 'Government Officer' : 'Citizen Volunteer'}.`);
          setLoading(false);
          return;
        }
        
        if (actualRole === 'officer') {
          navigate('/officer-dashboard');
        } else {
          navigate('/citizen-dashboard');
        }
      } else {
        const defaultProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: 'citizen',
          name: firebaseUser.displayName || 'Volunteer',
          preferences: { language: 'en', theme: 'dark' }
        };
        localStorage.setItem('mock_current_user', JSON.stringify(defaultProfile));
        window.dispatchEvent(new Event('mock-auth-state-change'));

        if (activeRole !== 'citizen') {
          setError(`Access Denied: The credentials entered do not belong to a Government Officer.`);
          setLoading(false);
          return;
        }
        navigate('/citizen-dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const firebaseUser = await loginWithGoogle();
      
      if (isMockFirebase) {
        const role = firebaseUser.role || 'citizen';
        if (role === 'officer') {
          navigate('/officer-dashboard');
        } else {
          navigate('/citizen-dashboard');
        }
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const profile = userDoc.data();
        
        // Cache user details in local storage to keep state synchronized
        const activeProfile = { uid: firebaseUser.uid, email: firebaseUser.email, ...profile };
        localStorage.setItem('mock_current_user', JSON.stringify(activeProfile));
        window.dispatchEvent(new Event('mock-auth-state-change'));

        const actualRole = profile.role || 'citizen';
        if (actualRole === 'officer') {
          navigate('/officer-dashboard');
        } else {
          navigate('/citizen-dashboard');
        }
      } else {
        const defaultProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: 'citizen',
          name: firebaseUser.displayName || 'Google Volunteer',
          preferences: { language: 'en', theme: 'dark' }
        };
        localStorage.setItem('mock_current_user', JSON.stringify(defaultProfile));
        window.dispatchEvent(new Event('mock-auth-state-change'));
        navigate('/citizen-dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validations
    if (!regName || !regEmail || !regPassword || !regConfirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const deptVal = regRole === 'officer' ? regDept : null;
      
      // Create user credential and write Firestore profile
      const result = await registerUser(regEmail, regPassword, regName, regRole, deptVal);
      
      // Cache details in local storage for real-time dashboard and sidebar syncing
      const activeProfile = { uid: result.user.uid, email: result.user.email, ...result.profile };
      localStorage.setItem('mock_current_user', JSON.stringify(activeProfile));
      window.dispatchEvent(new Event('mock-auth-state-change'));

      // Redirect based on selected role
      if (result.profile.role === 'officer') {
        navigate('/officer-dashboard');
      } else {
        navigate('/citizen-dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Registration failed. Try a different email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-6 px-4 sm:px-6 lg:px-8">
      {/* Background glow drop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Official Heading */}
      <div className="text-center max-w-xl mb-8 relative z-10 space-y-3 animate-fade-in">
        <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400 mb-1">
          <Landmark className="w-7 h-7" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-display">
          Jan Sathi Civic Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          Secure identity portal for municipal citizens and civic administrators.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="w-full max-w-md glass border-rose-500/30 bg-rose-950/10 text-rose-400 p-4 rounded-xl mb-5 flex items-center gap-3 animate-shake relative z-10">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}

      {/* Primary Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-visible relative z-10 flex flex-col hover:shadow-2xl transition-all duration-300">
        
        {/* Switch Tabs (Sign In / Register) */}
        <div className="flex border-b border-slate-150">
          <button
            onClick={() => { setAuthMode('signin'); setError(''); }}
            className={`flex-1 py-4 text-center text-sm font-bold transition-all rounded-tl-3xl cursor-pointer ${
              authMode === 'signin' 
                ? 'bg-slate-50 text-blue-600 border-b-2 border-blue-600' 
                : 'text-slate-400 hover:text-slate-700 bg-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setAuthMode('register'); setError(''); }}
            className={`flex-1 py-4 text-center text-sm font-bold transition-all rounded-tr-3xl cursor-pointer ${
              authMode === 'register' 
                ? 'bg-slate-50 text-blue-600 border-b-2 border-blue-600' 
                : 'text-slate-400 hover:text-slate-700 bg-white'
            }`}
          >
            Create Account
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {/* --- VIEW: SIGN IN --- */}
          {authMode === 'signin' && (
            <div className="space-y-6">
              
              {/* Custom Role Selector dropdown */}
              <div className="space-y-1.5 relative">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Signing in as
                </label>
                
                <button
                  type="button"
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-800 focus:outline-none transition-colors cursor-pointer ${
                    roleDropdownOpen ? 'border-blue-600 ring-2 ring-blue-100 bg-white' : 'border-slate-350 hover:bg-slate-100/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {activeRole === 'citizen' ? (
                      <>
                        <User className="w-4.5 h-4.5 text-blue-600" />
                        <span>Citizen Volunteer</span>
                      </>
                    ) : activeRole === 'officer' ? (
                      <>
                        <ShieldAlert className="w-4.5 h-4.5 text-slate-700" />
                        <span>Government Officer</span>
                      </>
                    ) : (
                      <span className="text-slate-400 font-normal">Select portal role...</span>
                    )}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${roleDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {roleDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 overflow-hidden divide-y divide-slate-100 animate-slide-down">
                    <button
                      type="button"
                      onClick={() => handleRoleSelect('citizen')}
                      className="w-full text-left p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer"
                    >
                      <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-900">Citizen Volunteer</span>
                        <span className="block text-[10px] text-slate-555 mt-0.5">Explore volunteer missions and log reports.</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleSelect('officer')}
                      className="w-full text-left p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer"
                    >
                      <div className="p-2 bg-slate-900/10 text-slate-800 rounded-lg shrink-0">
                        <ShieldAlert className="w-4 h-4 text-slate-700" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-900">Government Officer</span>
                        <span className="block text-[10px] text-slate-555 mt-0.5">Approve reports and manage point verifications.</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Form slide down */}
              <div className={`transition-all duration-350 ${activeRole ? 'opacity-100 border-t border-slate-100 pt-6' : 'opacity-65'}`}>
                {!activeRole ? (
                  <div className="text-center py-6 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <Sparkles className="w-5 h-5 text-blue-400 mx-auto mb-2 animate-pulse" />
                    <p className="text-xs text-slate-500 font-medium">Please select your portal role above to display input credentials.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-4 animate-fade-in">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder={activeRole === 'citizen' ? "alex.carter@JanSathi.org" : "officer.name@JanSathi.org"}
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-350 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPass ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-350 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-650 rounded-lg cursor-pointer"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full py-3 mt-4 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeRole === 'officer' 
                          ? 'bg-slate-900 hover:bg-slate-800' 
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/10'
                      }`}
                    >
                      {loading ? <span>Authenticating...</span> : <span>Sign In as {activeRole === 'officer' ? 'Officer' : 'Citizen'}</span>}
                    </button>
                    
                    {/* Divider */}
                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-slate-205"></div>
                        <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider">or</span>
                        <div className="flex-grow border-t border-slate-205"></div>
                    </div>

                    {/* Google Login Button */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.58c-.28 1.48-1.11 2.74-2.36 3.58v2.98h3.8c2.22-2.04 3.72-5.04 3.72-8.41z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.8-2.98c-1.05.7-2.4 1.12-4.13 1.12-3.18 0-5.88-2.15-6.84-5.04H1.28v3.08C3.26 21.3 7.37 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.16 14.19c-.25-.74-.39-1.53-.39-2.35s.14-1.61.39-2.35V6.41H1.28C.46 8.05 0 9.87 0 11.84s.46 3.79 1.28 5.43l3.88-3.08z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.93 1.19 15.22 0 12 0 7.37 0 3.26 2.7 1.28 6.41l3.88 3.08c.96-2.89 3.66-5.04 6.84-5.04z"
                        />
                      </svg>
                      <span>Sign In with Google</span>
                    </button>
                  </form>
                )}
              </div>

            </div>
          )}

          {/* --- VIEW: REGISTER ACCOUNT --- */}
          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Carter"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-350 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-colors"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex.carter@JanSathi.org"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-350 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-colors"
                />
              </div>

              {/* Role Option Toggle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Register as
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRegRole('citizen')}
                    className={`py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      regRole === 'citizen' 
                        ? 'border-blue-600 bg-blue-50 text-blue-600 ring-1 ring-blue-600' 
                        : 'border-slate-300 text-slate-650 hover:bg-slate-50'
                    }`}
                  >
                    Citizen Volunteer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('officer')}
                    className={`py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      regRole === 'officer' 
                        ? 'border-slate-950 bg-slate-50 text-slate-900 ring-1 ring-slate-950' 
                        : 'border-slate-300 text-slate-655 hover:bg-slate-50'
                    }`}
                  >
                    Govt Officer
                  </button>
                </div>
              </div>

              {/* Conditional Department Box (only for officers) */}
              {regRole === 'officer' && (
                <div className="space-y-1.5 animate-slide-down">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Assigned Municipal Department
                  </label>
                  <select
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-350 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-slate-800 transition-colors cursor-pointer"
                  >
                    <option value="Parks & Recreation">Parks & Recreation</option>
                    <option value="Environmental Protection">Environmental Protection</option>
                    <option value="Social & Human Services">Social & Human Services</option>
                    <option value="Education & Literacy">Education & Literacy</option>
                    <option value="Emergency Coordination">Emergency Coordination</option>
                  </select>
                </div>
              )}

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    placeholder="Min 6 characters"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-350 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-650 rounded-lg cursor-pointer"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-350 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-650 rounded-lg cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Register */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] cursor-pointer"
              >
                {loading ? <span>Registering Account...</span> : <span>Register & Sign In</span>}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
