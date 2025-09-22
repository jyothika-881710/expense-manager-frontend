import { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    user: null,
    token: null,
    email: null,
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedEmail = localStorage.getItem('userEmail');

    if (storedToken && storedUser && storedEmail) {
      try {
        jwtDecode(storedToken); // Validate token
        setAuth({
          user: JSON.parse(storedUser),
          token: storedToken,
          email: storedEmail,
        });
      } catch (e) {
        console.log('Invalid token, clearing...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userEmail');
      }
    }
  }, []);

  const login = (token, user) => {
    try {
      const email = user?.email;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userEmail', email);

      setAuth({ user, token, email });
    } catch (err) {
      console.error('Failed to store user data');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userEmail');
    setAuth({ user: null, token: null, email: null });
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
