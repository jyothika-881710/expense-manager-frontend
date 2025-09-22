import { Formik, Form, Field, ErrorMessage } from 'formik';
import Header from '../components/Header';
import logo from '../assets/logo.png';
import * as Yup from 'yup';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';

const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const initialValues = { name: '', email: '', password: '' };

  const validationSchema = Yup.object({
    name: Yup.string().min(3, 'Must be at least 3 characters').required('Required'),
    email: Yup.string().email('Invalid email').required('Required'),
    password: Yup.string().min(6, 'Must be at least 6 characters').required('Required'),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await axios.post('http://localhost:8083/api/auth/register', values);
      toast.success('Registered successfully! Please log in.');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
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
          background: 'linear-gradient(135deg, #6ECCAF 0%, #005B41 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative Elements */}
        <div className="position-absolute" style={{
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          bottom: '-150px',
          right: '-100px'
        }}></div>

        <div className="position-absolute" style={{
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          top: '-50px',
          left: '-50px'
        }}></div>

        <div className="card shadow-lg border-0 p-0 rounded-4 overflow-hidden" style={{ maxWidth: '500px', width: '100%' }}>
          <div className="row g-0">
            <div className="col-12">
              <div className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <img
                    src={logo}
                    alt="MoneyMate Logo"
                    style={{ height: '60px', marginBottom: '20px' }}
                  />
                  <h3 className="fw-bold">Create Account</h3>
                  <p className="text-muted small">Join MoneyMate to manage your expenses smarter</p>
                </div>

                <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
                  {({ isSubmitting }) => (
                    <Form>
                      <div className="mb-4">
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0">
                            <i className="bi bi-person text-success"></i>
                          </span>
                          <Field
                            name="name"
                            type="text"
                            className="form-control border-start-0 ps-0"
                            placeholder="Full Name"
                          />
                        </div>
                        <ErrorMessage name="name" component="div" className="text-danger small mt-1" />
                      </div>

                      <div className="mb-4">
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0">
                            <i className="bi bi-envelope text-success"></i>
                          </span>
                          <Field
                            name="email"
                            type="email"
                            className="form-control border-start-0 ps-0"
                            placeholder="Email Address"
                          />
                        </div>
                        <ErrorMessage name="email" component="div" className="text-danger small mt-1" />
                      </div>

                      <div className="mb-4">
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0">
                            <i className="bi bi-shield-lock text-success"></i>
                          </span>
                          <Field
                            name="password"
                            type={showPassword ? "text" : "password"}
                            className="form-control border-start-0 border-end-0 ps-0"
                            placeholder="Password"
                          />
                          <span
                            className="input-group-text bg-light border-start-0 cursor-pointer"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ cursor: 'pointer' }}
                          >
                            <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-success`}></i>
                          </span>
                        </div>
                        <ErrorMessage name="password" component="div" className="text-danger small mt-1" />
                      </div>

                      <div className="form-check mb-4">
                        <input className="form-check-input" type="checkbox" id="termsCheck" />
                        <label className="form-check-label small" htmlFor="termsCheck">
                          I agree to the <a href="#" className="text-decoration-none">Terms of Service</a> and <a href="#" className="text-decoration-none">Privacy Policy</a>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn-success w-100 fw-semibold py-2 mb-3"
                        style={{ borderRadius: '10px' }}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-person-check me-2"></i>
                            Create Account
                          </>
                        )}
                      </button>

                      <div className="text-center">
                        <small className="text-muted">
                          Already have an account? <Link to="/" className="text-decoration-none text-success fw-bold">Sign In</Link>
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

export default Register;