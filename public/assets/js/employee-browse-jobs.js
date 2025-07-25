import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCM1QSKbZH9Ih3RHv39nQipYoti8Yrji_M",
    authDomain: "careerstep-bpsu1.firebaseapp.com",
    projectId: "careerstep-bpsu1",
    storageBucket: "careerstep-bpsu1.firebasestorage.app",
    messagingSenderId: "17047315291",
    appId: "1:17047315291:web:dc2c9312e3d5b0ced5307e",
    measurementId: "G-WH6DT9HQW2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global variables
let currentUser = null;
let userSkills = [];
let availableSeeds = [];
let currentSeedIndex = 0;
let nurturedSeedIds = new Set();
let appliedJobIds = new Set();

// DOM Elements
const loadingScreen = document.getElementById('loadingScreen');
const loginPrompt = document.getElementById('loginPrompt');
const jobCardsContainer = document.getElementById('jobCardsContainer');
const noJobsMessage = document.getElementById('noJobsMessage');
const passBtn = document.getElementById('passBtn');
const nurtureBtn = document.getElementById('nurtureBtn');
const goToLoginBtn = document.getElementById('goToLoginBtn');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    highlightCurrentNavLink();

    // Check auth state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserProfile();
            await loadNurturedSeeds();
            await loadAppliedJobs();
            await loadJobSeeds();
            showApp();
        } else {
            // Redirect to login if not authenticated
            window.location.href = './login.html';
        }
    });

    // Event listeners
    passBtn.addEventListener('click', passCurrentSeed);
    nurtureBtn.addEventListener('click', nurtureCurrentSeed);

    if (goToLoginBtn) {
        goToLoginBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }

    // Touch events for swipe gestures
    let touchStartX = 0;
    let touchEndX = 0;

    // Then modify the event listeners to use these global variables:
    jobCardsContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    jobCardsContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);
});

function highlightCurrentNavLink() {
    const currentPath = window.location.pathname.split('/').pop(); // Get the filename, e.g., 'employee-home.html'
    const navLinks = document.querySelectorAll('nav a');

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href').split('/').pop();
        if (linkPath === currentPath) {
            link.classList.add('underline', 'underline-offset-4');
        }
    });
}

// Load user profile from Firestore
async function loadUserProfile() {
    try {
        const userDoc = await getDoc(doc(db, 'careerstepEmployees', currentUser.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            userSkills = userData.jobPreferences?.skills || [];
        } else {
            console.error('User profile not found');
            window.location.href = './login.html';
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Load nurtured seeds from Firestore
async function loadNurturedSeeds() {
    try {
        const userDoc = await getDoc(doc(db, 'careerstepEmployees', currentUser.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            nurturedSeedIds = new Set((data.nurturedSeeds || []).map(seed => seed.id));
        } else {
            nurturedSeedIds = new Set();
        }
    } catch (e) {
        nurturedSeedIds = new Set();
    }
}

// Load applied jobs from Firestore
async function loadAppliedJobs() {
    try {
        const q = query(collection(db, 'applications'), where('applicantId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        appliedJobIds = new Set();
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.jobId) appliedJobIds.add(data.jobId);
        });
    } catch (e) {
        appliedJobIds = new Set();
    }
}

// Load job seeds that match the user's skills
async function loadJobSeeds() {
    try {
        // Get jobs from employers who liked this employee
        let prioritizedJobs = [];
        const employeeDoc = await getDoc(doc(db, 'careerstepEmployees', currentUser.uid));
        if (employeeDoc.exists()) {
            const employeeData = employeeDoc.data();
            const likedByEmployers = employeeData.likedByEmployers || [];

            if (likedByEmployers.length > 0) {
                const employerIds = [...new Set(likedByEmployers.map(like => like.employerId))];
                const jobsQuery = query(
                    collection(db, 'jobSeeds'),
                    where('employerId', 'in', employerIds),
                    where('status', '==', 'active')
                );
                const jobsSnapshot = await getDocs(jobsQuery);

                prioritizedJobs = jobsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    isPriority: true, // Mark as priority
                    matchingSkills: getMatchingSkills(doc.data().skills)
                })).filter(seed => {
                    // Only include priority jobs that match skills OR have no skills required
                    return seed.matchingSkills.length > 0 || !seed.skills || seed.skills.length === 0;
                });
            }
        }

        // Get other jobs that match skills
        let otherJobs = [];
        const seedsQuery = query(
            collection(db, 'jobSeeds'),
            where('status', '==', 'active')
        );
        const seedsSnapshot = await getDocs(seedsQuery);

        seedsSnapshot.forEach((doc) => {
            const seedData = doc.data();
            const matchingSkills = getMatchingSkills(seedData.skills);

            // Only include if:
            // 1. Not already in prioritizedJobs
            // 2. Not already nurtured
            // 3. Not already applied
            // 4. Either has matching skills OR no skills required
            if (!prioritizedJobs.some(j => j.id === doc.id) &&
                !nurturedSeedIds.has(doc.id) &&
                !appliedJobIds.has(doc.id) &&
                (matchingSkills.length > 0 || !seedData.skills || seedData.skills.length === 0)) {

                otherJobs.push({
                    id: doc.id,
                    ...seedData,
                    isPriority: false,
                    matchingSkills: matchingSkills
                });
            }
        });

        // Combine and sort (prioritized first)
        availableSeeds = [...prioritizedJobs, ...otherJobs];

        if (availableSeeds.length > 0) {
            displayCurrentSeed();
        } else {
            jobCardsContainer.innerHTML = '';
            noJobsMessage.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading job seeds:', error);
        jobCardsContainer.innerHTML = '';
        noJobsMessage.classList.remove('hidden');
    }
}

// Get matching skills between job and user
function getMatchingSkills(jobSkills) {
    if (!jobSkills || jobSkills.length === 0) return [];
    if (userSkills.length === 0) return [];

    return jobSkills.filter(skill =>
        userSkills.some(userSkill =>
            userSkill.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(userSkill.toLowerCase())
        )
    );
}

// Display current job seed card
async function displayCurrentSeed() {
    if (currentSeedIndex >= availableSeeds.length) {
        jobCardsContainer.innerHTML = `
            <div class="text flex flex-col items-center justify-center">
                <i class="fas fa-check fa-3x mb-3 text-[#65956C]"></i>
                <h4 class="text-xl font-semibold">You're all caught up!</h4>
                <p class="text-gray-600">Check back later for new job matchings</p>
            </div>
        `;
        nurtureBtn.disabled = true;
        passBtn.disabled = true;
        nurtureBtn.classList.add('opacity-50');
        passBtn.classList.add('opacity-50');
        return;
    }

    noJobsMessage.classList.add('hidden');
    const seed = availableSeeds[currentSeedIndex];
    const isNurtured = nurturedSeedIds.has(seed.id);
    const isApplied = appliedJobIds.has(seed.id);

    // 🔍 Fetch employer info
    let companyName = 'N/A';
    let contactEmail = 'N/A';
    let contactNumber = 'N/A';

    try {
        const employerDoc = await getDoc(doc(db, 'employers', seed.employerId));
        if (employerDoc.exists()) {
            const info = employerDoc.data().companyInfo;
            companyName = info?.companyName || 'N/A';
            contactNumber = info?.contactNumber || 'N/A';
        }
    } catch (e) {
        console.error("Error fetching employer info:", e);
    }

    // Separate matched and unmatched skills
    const matchedSkills = (seed.skills || []).filter(skill =>
        seed.matchingSkills.includes(skill)
    );
    const unmatchedSkills = (seed.skills || []).filter(skill =>
        !seed.matchingSkills.includes(skill)
    );

    // Cap unmatched skills to 3
    const visibleUnmatched = unmatchedSkills.slice(0, 3);
    const hiddenUnmatched = unmatchedSkills.slice(3);

    // Create HTML for matched skills
    const matchedHTML = matchedSkills.map(skill => `
        <span class="inline-block text-md px-4 py-1 rounded-lg border text-center bg-[#E8F5E9] border-[#73A267] text-[#2E7D32] font-semibold">
            ${skill}
        </span>
    `).join('');

    // Create HTML for visible unmatched skills
    const unmatchedHTML = visibleUnmatched.map(skill => `
        <span class="inline-block text-md px-4 py-1 rounded-lg border text-center bg-white border border-gray-300 text-[#3D3D3D]">
            ${skill}
        </span>
    `).join('');

    // Create "+N more" badge if needed
    const moreCount = hiddenUnmatched.length;
    const moreHTML = moreCount > 0
        ? `<span class="inline-block text-md px-4 py-1 rounded-lg border text-center bg-gray-200 text-gray-600 border-gray-300 cursor-default"
                title="${hiddenUnmatched.join(', ')}">
                +${moreCount} more
        </span>`
        : '';

    // Combine all
    const skillsHTML = matchedHTML + unmatchedHTML + moreHTML;

    const seedCardHTML = `
        <div class="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-5">
            <div class="flex flex-col">
                <span class="flex-1 text-[#3D3D3D] text-2xl font-bold overflow-hidden whitespace-nowrap text-ellipsis">
                    ${seed.jobTitle}
                </span>
                <span class="flex-1 text-[#3D3D3D] text-md overflow-hidden whitespace-nowrap text-ellipsis">
                    ${companyName}
                </span>
            </div>

            <span class="text-[#3D3D3D] text-sm flex items-center gap-1 mt-1 md:mt-0 shrink-0 whitespace-nowrap">
                <i class="far fa-clock text-[#3D3D3D] text-xs"></i>
                Posted ${formatPostDate(seed.createdAt.toDate())}
            </span>
        </div>

        <div class="flex flex-col gap-2 mt-4">
            <h3 class="text-[#65956C] text-lg font-bold">Job Offer</h3>
            <p class="text-[#3D3D3D] text-md leading-relaxed">${seed.offer || 'No offer details provided'}</p>
        </div>

        <div class="flex flex-col gap-2 mt-4">
            <h3 class="text-[#65956C] text-lg font-bold">Job Location</h3>
            <div class="flex flex-wrap gap-2 overflow-y-auto pr-1 max-h-[6.5rem] scroll-smooth">
                <span class="inline-block text-md px-4 py-1 rounded-lg border text-center bg-white border border-gray-300 text-[#3D3D3D]">
                    ${seed.location || 'N/A'}
                </span>
            </div>
        </div>

        <div class="flex flex-col gap-2 mt-4">
            <div class="flex items-center gap-4">
                <h3 class="text-[#65956C] text-lg font-bold">Skills Required</h3>
                ${seed.matchingSkills.length > 0 ? `
                    <span class="text-center text-xs px-2 py-1 bg-[#65956C] text-white rounded-md">
                        ${seed.matchingSkills.length} Match${seed.matchingSkills.length > 1 ? 'es' : ''}
                    </span>` : ''}
            </div>

            <div class="flex flex-wrap gap-2 overflow-y-auto pr-1 max-h-[6.5rem] scroll-smooth">
                ${skillsHTML}
            </div>
        </div>

        <div class="flex justify-between flex-1 text-[#3D3D3D] text-md gap-2 mt-4">
            <div class="flex flex-col flex-1 gap-2">
                <span class="flex items-center gap-2">
                    <i class="fas fa-door-open text-[#65956C]"></i>
                    <strong class="text-[#3D3D3D]">Vacancies:</strong> ${seed.positionsAvailable ?? 'N/A'}
                </span>
                <span class="flex items-center gap-2">
                    <i class="fas fa-users text-[#65956C]"></i>
                    <strong class="text-[#3D3D3D]">Needed:</strong> ${seed.positionsNeeded || 'N/A'}
                </span>
            </div>

            <div class="flex flex-col flex-1 gap-2">
                <span class="flex items-center gap-2">
                    <i class="fas fa-envelope text-[#65956C]"></i>
                    <strong class="text-[#3D3D3D]">Email:</strong> ${seed.employerEmail || 'N/A'}
                </span>
                <span class="flex items-center gap-2">
                    <i class="fas fa-phone-alt text-[#65956C]"></i>
                    <strong class="text-[#3D3D3D]">Contact:</strong> ${contactNumber}
                </span>
            </div>
        </div>

        ${seed.isPriority ? `
            <div class="mt-2 text-[#3D6585] font-semibold">
                <i class="fas fa-star"></i> Priority - This employer liked your profile
            </div>
        ` : ''}

        ${isNurtured ? `
            <div class="mt-4 text-[#65956C] font-semibold">
                <i class="fas fa-heart"></i> You've liked this job
            </div>
        ` : ''}

        ${isApplied ? `
            <div class="mt-2 text-[#65956C] font-semibold">
                <i class="fas fa-paper-plane"></i> You've applied to this job
            </div>
        ` : ''}
    `;

    jobCardsContainer.innerHTML = seedCardHTML;

    // Update button states
    if (isNurtured) {
        nurtureBtn.disabled = true;
        nurtureBtn.classList.add('opacity-50');
    } else {
        nurtureBtn.disabled = false;
        nurtureBtn.classList.remove('opacity-50');
    }
}

// Format post date
function formatPostDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

// Pass on current seed
async function passCurrentSeed() {
    if (currentSeedIndex >= availableSeeds.length) return;

    // Animation
    jobCardsContainer.classList.add('opacity-0', 'transition-opacity', 'duration-300');

    setTimeout(() => {
        currentSeedIndex++;
        jobCardsContainer.classList.remove('opacity-0');
        displayCurrentSeed();
    }, 300);
}

// Nurture current seed
async function nurtureCurrentSeed() {
    if (currentSeedIndex >= availableSeeds.length) return;
    const seed = availableSeeds[currentSeedIndex];

    if (nurturedSeedIds.has(seed.id)) {
        showToastMessage("You've already liked this job!");
        return;
    }

    try {
        // Create a clean seed object with only the fields we need
        const seedToSave = {
            id: seed.id,
            jobTitle: seed.jobTitle || 'No title',
            companyName: seed.companyName || 'No company',
            location: seed.location || 'No location',
            offer: seed.offer || 'No offer details',
            skills: seed.skills || [],
            matchingSkills: seed.matchingSkills || [],
            createdAt: new Date()
        };

        // Add to nurtured seeds in Firestore
        await updateDoc(doc(db, 'careerstepEmployees', currentUser.uid), {
            nurturedSeeds: arrayUnion(seedToSave)
        });

        nurturedSeedIds.add(seed.id);
        showToastMessage("Job saved to your liked jobs!");

        // Animation
        jobCardsContainer.classList.add('opacity-0', 'transition-opacity', 'duration-300');

        setTimeout(() => {
            currentSeedIndex++;
            jobCardsContainer.classList.remove('opacity-0');
            displayCurrentSeed();
        }, 300);

    } catch (error) {
        console.error('Error saving nurtured seed:', error);
        showToastMessage("Failed to save job: " + (error.message || error));
    }
}

// Show toast message
function showToastMessage(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('opacity-0', 'pointer-events-none');

    // Hide after 2 seconds
    setTimeout(() => {
        toast.classList.add('opacity-0', 'pointer-events-none');
    }, 2000);
}

// Handle swipe gestures
function handleSwipe() {
    const threshold = 50; // Minimum swipe distance
    const swipeDistance = touchEndX - touchStartX;

    if (swipeDistance > threshold) {
        nurtureCurrentSeed();
    } else if (swipeDistance < -threshold) {
        passCurrentSeed();
    }
}

// Show login prompt
function showLoginPrompt() {
    loadingScreen.classList.add('hidden');
    loginPrompt.classList.remove('hidden');
}

// Show the app after loading
function showApp() {
    try {
        document.getElementById('loadingScreen')?.classList?.add('hidden');
        document.getElementById('loginPrompt')?.classList?.add('hidden');
    } catch (e) {
        console.log("Loading elements not found");
    }
}