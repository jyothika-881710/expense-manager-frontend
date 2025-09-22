import { Formik, Form, Field, ErrorMessage } from 'formik';
import Header from '../components/Header';
import logo from '../assets/logo.png';
import * as Yup from 'yup';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await axios.post('http://localhost:8083/api/auth/forgot-password', { email: values.email });
      toast.success('Password reset link sent to your email!');
      navigate('/reset-password');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset link');
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
          background: 'linear-gradient(135deg, #8E8EFF 0%, #4949FF 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative Elements */}
        <div className="position-absolute" style={{
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          top: '20%',
          right: '10%'
        }}></div>

        <div className="position-absolute" style={{
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          bottom: '10%',
          left: '5%'
        }}></div>

        <div className="card shadow-lg border-0 p-0 rounded-4 overflow-hidden" style={{ maxWidth: '420px', width: '100%' }}>
          <div className="card-body p-4 p-md-5">
            <div className="text-center mb-4">
              <img
                src={logo}
                alt="MoneyMate Logo"
                style={{ height: '60px', marginBottom: '20px' }}
              />
              <h3 className="fw-bold">Forgot Password?</h3>
              <p className="text-muted small">Enter your email to receive a reset link</p>
            </div>

            <Formik
              initialValues={{ email: '' }}
              validationSchema={Yup.object({
                email: Yup.string().email('Invalid email').required('Required'),
              })}
              onSubmit={handleSubmit}
            >
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
                        placeholder="Your Email Address"
                      />
                    </div>
                    <ErrorMessage name="email" component="div" className="text-danger small mt-1" />
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
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-envelope-paper me-2"></i>
                        Send Reset Link
                      </>
                    )}
                  </button>

                  <div className="text-center mt-4">
                    <div className="d-flex justify-content-center align-items-center">
                      <div className="border-bottom flex-grow-1"></div>
                      <div className="px-3 text-muted small">OR</div>
                      <div className="border-bottom flex-grow-1"></div>
                    </div>

                    <div className="mt-3">
                      <Link to="/" className="btn btn-outline-primary rounded-pill px-4 me-2">
                        <i className="bi bi-arrow-left me-2"></i>Back to Login
                      </Link>
                    </div>
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

export default ForgotPassword;