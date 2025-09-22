import { Formik, Form, Field, ErrorMessage } from 'formik';
import Header from '../components/Header';
import logo from '../assets/logo.png';
import * as Yup from 'yup';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculateStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    setPasswordStrength(strength);
  };

  const getStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-secondary';
    if (passwordStrength === 1) return 'bg-danger';
    if (passwordStrength === 2) return 'bg-warning';
    if (passwordStrength === 3) return 'bg-info';
    return 'bg-success';
  };

  const getStrengthText = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength === 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await axios.post('http://localhost:8083/api/auth/reset-password', {
        token: values.token,
        newPassword: values.password,
      });
      toast.success('Password reset successfully!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
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
          background: 'linear-gradient(135deg, #3A1C71 0%, #D76D77 50%, #FFAF7B 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative Elements */}
        <div className="position-absolute" style={{
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          top: '10%',
          left: '5%'
        }}></div>

        <div className="position-absolute" style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          bottom: '15%',
          right: '10%'
        }}></div>

        <div className="card shadow-lg border-0 p-0 rounded-4 overflow-hidden" style={{ maxWidth: '460px', width: '100%' }}>
          <div className="card-body p-4 p-md-5">
            <div className="text-center mb-4">
              <img
                src={logo}
                alt="MoneyMate Logo"
                style={{ height: '60px', marginBottom: '20px' }}
              />
              <h3 className="fw-bold">Reset Your Password</h3>
              <p className="text-muted small">Enter your reset token and create a new password</p>
            </div>

            <Formik
              initialValues={{ token: '', password: '', confirmPassword: '' }}
              validationSchema={Yup.object({
                token: Yup.string().required('Token is required'),
                password: Yup.string().min(6, 'At least 6 characters').required('Required'),
                confirmPassword: Yup.string()
                  .oneOf([Yup.ref('password'), null], 'Passwords must match')
                  .required('Required'),
              })}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting, values, handleChange }) => (
                <Form>
                  <div className="mb-4">
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="bi bi-ticket-perforated text-primary"></i>
                      </span>
                      <Field
                        name="token"
                        type="text"
                        className="form-control border-start-0 ps-0"
                        placeholder="Reset Token"
                      />
                    </div>
                    <ErrorMessage name="token" component="div" className="text-danger small mt-1" />
                  </div>

                  <div className="mb-3">
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="bi bi-lock text-primary"></i>
                      </span>
                      <Field
                        name="password"
                        type={showPassword ? "text" : "password"}
                        className="form-control border-start-0 border-end-0 ps-0"
                        placeholder="New Password"
                        onChange={(e) => {
                          handleChange(e);
                          calculateStrength(e.target.value);
                        }}
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

                    {values.password && (
                      <div className="mt-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div className="progress w-75" style={{ height: '8px' }}>
                            <div
                              className={`progress-bar ${getStrengthColor()}`}
                              style={{ width: `${passwordStrength * 25}%` }}
                              role="progressbar"
                            ></div>
                          </div>
                          <small className="text-muted">{getStrengthText()}</small>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="bi bi-lock-fill text-primary"></i>
                      </span>
                      <Field
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        className="form-control border-start-0 ps-0"
                        placeholder="Confirm New Password"
                      />
                    </div>
                    <ErrorMessage name="confirmPassword" component="div" className="text-danger small mt-1" />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary w-100 fw-semibold py-2 mb-3"
                    style={{ borderRadius: '10px' }}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Resetting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle me-2"></i>
                        Reset Password
                      </>
                    )}
                  </button>

                  <div className="text-center mt-3">
                    <Link to="/" className="text-decoration-none">
                      <i className="bi bi-arrow-left me-1"></i> Back to Login
                    </Link>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;