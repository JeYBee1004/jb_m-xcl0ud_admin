document.addEventListener('contextmenu', function (e) {
e.preventDefault();
});

document.addEventListener('keydown', function (e) {
if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
    (e.ctrlKey && e.key === 'U')
) {
    e.preventDefault();
}
});

const SUPABASE_URL = 'https://ocjppztixpvqcmqozmto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9janBwenRpeHB2cWNtcW96bXRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjI3ODEsImV4cCI6MjA3NDA5ODc4MX0.I8UEF_Sq-50wfikKmOc7StoqdHj0vclQbzCsfkCSb4c';

try {
    if (
        SUPABASE_URL && SUPABASE_ANON_KEY &&
        SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' &&
        SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE'
    ) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized successfully');
    } else {
        console.error('❌ Supabase credentials not configured properly');
    }
} catch (error) {
    console.error('❌ Error initializing Supabase:', error);
}

// Form elements
const loginSection = document.getElementById('login-section');
const signupSection = document.getElementById('signup-section');
const toSignup = document.getElementById('to-signup');
const toLogin = document.getElementById('to-login');
const loginMsg = document.getElementById('login-message');
const signupMsg = document.getElementById('signup-message');

// Toggle between sections
toSignup.addEventListener('click', () => {
  loginSection.style.display = 'none';
  signupSection.style.display = 'block';
  loginMsg.textContent = '';
});

toLogin.addEventListener('click', () => {
  signupSection.style.display = 'none';
  loginSection.style.display = 'block';
  signupMsg.textContent = '';
});

// LOGIN HANDLER
loginSection.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMsg.textContent = '';
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    loginMsg.textContent = '✅ Login successful! Redirecting...';
    loginMsg.className = 'success-message';
    setTimeout(() => window.location.href = 'admin.html', 2000);
  } catch (error) {
    loginMsg.textContent = `❌ ${error.message}`;
    loginMsg.className = 'error-message';
  }
});

// SIGNUP HANDLER
signupSection.addEventListener('submit', async (e) => {
  e.preventDefault();
  signupMsg.textContent = '';
  const fullName = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value.trim();

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;

    signupMsg.textContent = '✅ Account created successfully! Check your email to verify.';
    signupMsg.className = 'success-message';
    setTimeout(() => {
      signupSection.reset();
      signupSection.style.display = 'none';
      loginSection.style.display = 'block';
    }, 3000);
  } catch (error) {
    signupMsg.textContent = `❌ ${error.message}`;
    signupMsg.className = 'error-message';
  }
});
