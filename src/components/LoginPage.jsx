import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBarChart2, FiLock, FiMail, FiLogIn, FiEye, FiEyeOff } from 'react-icons/fi';
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const ADMIN_UID = "ZpokHqjdcXghrgJ4HvWPnGidb962";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      if (user.uid !== ADMIN_UID) {
        await signOut(auth);
        setError("You are not authorized");
        setLoading(false);
        return;
      }

      const adminRef = doc(db, "admin", user.uid);
      const adminSnap = await getDoc(adminRef);

      let adminData = {};

      if (!adminSnap.exists()) {
        // First time login - create new admin document
        const newAdmin = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || "Admin User",
          photoURL: user.photoURL || "",
          role: "admin",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await setDoc(adminRef, newAdmin);
        adminData = newAdmin;
      } else {
        // Existing user - get their data including photoURL
        adminData = {
          uid: user.uid,
          email: adminSnap.data().email || user.email,
          name: adminSnap.data().name || "Admin User",
          photoURL: adminSnap.data().photoURL || "",
          role: adminSnap.data().role || "admin",
          createdAt: adminSnap.data().createdAt,
          updatedAt: adminSnap.data().updatedAt
        };
      }

      // Save to localStorage
      localStorage.setItem("adminUser", JSON.stringify(adminData));

      // Notify header about login
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: adminData 
      }));

      if (onLogin) {
        onLogin(adminData);
      }

      navigate("/", { replace: true });

    } catch (err) {
      console.error(err);
      setError("Invalid email or password");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-center">
          <div className="inline-flex p-4 bg-white/20 backdrop-blur rounded-2xl mb-4 shadow-md">
            <FiBarChart2 className="text-white text-4xl" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-1">Welcome Back</h2>
          <p className="text-white/90 text-sm">Admin Dashboard Access</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg text-sm shadow-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="p-8 pt-6">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 text-gray-700 transition"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 text-gray-700 transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-purple-600 transition"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <FiLogIn />
                  Login to Dashboard
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}