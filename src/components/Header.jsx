import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import logo from '../assets/logo.png'; // adjust the path if needed

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isLoginPage = location.pathname === '/';

  return (
    <div 
      className={`sticky-top bg-white border-bottom py-3 px-4 transition-all duration-300 d-flex justify-content-between align-items-center ${scrolled ? 'shadow-lg' : 'shadow-sm'}`}
    >
      <div className="d-flex align-items-center">
        <img 
          src={logo} 
          alt="MoneyMate Logo" 
          style={{ height: '40px', width: '40px', marginRight: '12px', cursor: 'pointer' }} 
          onClick={() => navigate('/')}
        />
        <h2
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
          className="text-primary m-0 fw-bold"
        >
          <span className="text-primary">Expense</span>
          <span className="text-dark">Pro</span>
        </h2>
      </div>
      
      <div className="d-none d-md-flex">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="btn btn-sm btn-outline-primary mx-1 rounded-pill px-3"
        >
          <i className="bi bi-speedometer2 me-1"></i> Dashboard
        </button>
        {!isLoginPage && (
          <button 
            onClick={() => navigate('/')} 
            className="btn btn-sm btn-outline-primary mx-1 rounded-pill px-3"
          >
            <i className="bi bi-box-arrow-in-right me-1"></i> Login
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;
