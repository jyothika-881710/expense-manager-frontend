import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import logo from '../assets/logo.png'; 
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import { useState } from 'react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const initialValues = {
    email: '',
    password: '',
  };

  const validationSchema = Yup.object({
    email: Yup.string().email('Invalid email format').required('Required'),
    password: Yup.string().min(6, 'Minimum 6 characters').required('Required'),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      const res = await axios.post('http://localhost:8083/api/auth/login', values);
      const { token, user } = res.data;
      login(token, user);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{
          background: 'linear-gradient(135deg, #6B73FF 0%, #000DFF 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative Elements */}
        <div className="position-absolute" style={{
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          top: '-50px',
          right: '-50px'
        }}></div>

        <div className="position-absolute" style={{
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          bottom: '-150px',
          left: '-100px'
        }}></div>

        <div className="card shadow-lg border-0 p-0 rounded-4 overflow-hidden" style={{ maxWidth: '450px', width: '100%' }}>
          <div className="row g-0">
            <div className="col-12">
              <div className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <img
                    src={logo}
                    alt="MoneyMate Logo"
                    style={{ height: '60px', marginBottom: '20px' }}
                  />
                  <h3 className="fw-bold text-dark">Welcome Back</h3>
                  <p className="text-muted small">Login to continue to MoneyMate</p>
                </div>


                <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
                  {({ isSubmitting }) => (
                    <Form>
                      <div className="mb-4">
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0">
                            <i className="bi bi-envelope text-primary"></i>
                          </span>
                          <Field
                            name="email"
                            type="email"
                            className="form-control border-start-0 ps-0"
                            id="email"
                            placeholder="Email address"
                          />
                        </div>
                        <ErrorMessage name="email" component="div" className="text-danger small mt-1" />
                      </div>

                      <div className="mb-4">
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0">
                            <i className="bi bi-key text-primary"></i>
                          </span>
                          <Field
                            name="password"
                            type={showPassword ? "text" : "password"}
                            className="form-control border-start-0 border-end-0 ps-0"
                            id="password"
                            placeholder="Password"
                          />
                          <span
                            className="input-group-text bg-light border-start-0 cursor-pointer"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ cursor: 'pointer' }}
                          >
                            <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-primary`}></i>
                          </span>
                        </div>
                        <ErrorMessage name="password" component="div" className="text-danger small mt-1" />
                      </div>

                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="rememberMe" />
                          <label className="form-check-label small" htmlFor="rememberMe">
                            Remember me
                          </label>
                        </div>
                        <small>
                          <Link to="/forgot-password" className="text-decoration-none text-primary">
                            Forgot password?
                          </Link>
                        </small>
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary w-100 fw-semibold py-2 mb-3"
                        style={{ borderRadius: '10px' }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-box-arrow-in-right me-2"></i>
                            Login
                          </>
                        )}
                      </button>

                      <div className="text-center">
                        <small className="text-muted">
                          Don't have an account? <Link to="/register" className="text-decoration-none text-primary fw-bold">Sign Up</Link>
                        </small>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;