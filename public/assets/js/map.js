// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: "AIzaSyCM1QSKbZH9Ih3RHv39nQipYoti8Yrji_M",
            authDomain: "careerstep-bpsu1.firebaseapp.com",
            projectId: "careerstep-bpsu1",
            storageBucket: "careerstep-bpsu1.appspot.com",
            messagingSenderId: "17047315291",
            appId: "1:17047315291:web:dc2c9312e3d5b0ced5307e",
            measurementId: "G-WH6DT9HQW2"
  });
}

const db = firebase.firestore();
let map;
let provinceLayers = {};
let provinceData = {};
let currentMetric = 'totalJobs';
let currentSkillFilter = 'all';
let selectedProvince = null;
let allSkills = [];

// New function to handle the complete initialization flow
async function initializeApplication() {
  try {
    // 1. Initialize Firebase and map first
    initMap(); // This will call loadAllData() internally
    
    // 2. Wait until provinceData is fully populated
    await waitForDataLoad();
    
    // 3. Verify we have multiple provinces
    if (Object.keys(provinceData).length <= 1) {
      throw new Error('Insufficient province data loaded');
    }
    
    // 4. Upload to HRINA
    await uploadHirnaData();
    
    console.log('Application fully initialized with', 
      Object.keys(provinceData).length, 'provinces');
  } catch (error) {
    console.error('Initialization failed:', error);
    showError(`Initialization error: ${error.message}`);
  }
}

// Helper function to wait for data completion
function waitForDataLoaded() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (Object.keys(provinceData).length > 1 && 
          Object.values(provinceData)[0].metrics.activeJobs !== undefined) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });
}

// Update DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', initializeApplication);

// Main initialization function
function initMap() {
  map = new google.maps.Map(document.getElementById("northLuzonMap"), {
    center: { lat: 16.5, lng: 121 },
    zoom: 7,
    disableDefaultUI: true,
    gestureHandling: "greedy",
    styles: [
      {
        featureType: "administrative.province",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "administrative.province",
        elementType: "geometry",
        stylers: [{ visibility: "off" }]
      }
    ]
  });

  // Load all necessary data
  loadAllData().then(() => {
    setupUI();
  }).catch(error => {
    console.error("Error loading data:", error);
    showError("Failed to load data. Please refresh the page.");
  });
}

async function loadAllData() {
  try {
    // Load province geometries
    const provincesResponse = await fetch('assets/js/provinces.json');
    const provinces = await provincesResponse.json();
    
    console.log(`Initializing data for ${provinces.length} provinces`);
    
    // Initialize province data structure
    provinces.forEach(province => {
      provinceData[province.name] = {
        geoJson: province.geoJson,
        center: province.center,
        metrics: {
          totalJobs: 0,
          activeJobs: 0,
          jobSeekers: 0,
          employers: 0,
          fulfillmentRate: 0,
          avgFulfillmentTime: 0,
          bySkill: {}
        },
        topSkills: []
      };
    });
    
    console.log('Province data initialized:', Object.keys(provinceData));

    // Load all data in parallel
    const [
      jobSeedsSnapshot, 
      jobApplicationsSnapshot,
      employeeRegSnapshot,
      employerRegSnapshot,
      skillsSnapshot
    ] = await Promise.all([
      db.collection('jobSeedsAnalytics').get(),
      db.collection('jobApplicationAnalytics').get(),
      db.collection('employeeRegistrationAnalytics').get(),
      db.collection('employerRegistrationAnalytics').get(),
      db.collection('skills').doc('skilled_worker_skills').get()
    ]);

    // Process skills
    allSkills = skillsSnapshot.exists ? skillsSnapshot.data().items || [] : [];
    populateSkillFilter(allSkills);

    // Process job seeds data
    jobSeedsSnapshot.forEach(doc => {
      const [skillType, province] = doc.id.split('_');
      const data = doc.data();
      
      if (province === 'overall') {
        // Update all provinces for this skill type
        Object.values(provinceData).forEach(p => {
          if (!p.metrics.bySkill[skillType]) {
            p.metrics.bySkill[skillType] = {
              totalJobs: 0,
              activeJobs: 0,
              jobSeekers: 0,
              fulfillmentRate: 0,
              avgFulfillmentTime: 0
            };
          }
        });
      } else if (provinceData[province]) {
        if (skillType === 'overall') {
          // Overall province metrics
          provinceData[province].metrics.totalJobs += data.totalCreated || 0;
          provinceData[province].metrics.activeJobs += data.currentCount || 0;
        } else {
          // Skill-specific metrics
          if (!provinceData[province].metrics.bySkill[skillType]) {
            provinceData[province].metrics.bySkill[skillType] = {
              totalJobs: 0,
              activeJobs: 0,
              jobSeekers: 0,
              fulfillmentRate: 0,
              avgFulfillmentTime: 0
            };
          }
          provinceData[province].metrics.bySkill[skillType].totalJobs += data.totalCreated || 0;
          provinceData[province].metrics.bySkill[skillType].activeJobs += data.currentCount || 0;
        }
      }
    });

    // Process job application data (for fulfillment rates and times)
    jobApplicationsSnapshot.forEach(doc => {
      const [skillType, province] = doc.id.split('_');
      const data = doc.data();
      
      if (province === 'overall') {
        // Update all provinces for this skill type
        Object.values(provinceData).forEach(p => {
          if (p.metrics.bySkill[skillType]) {
            p.metrics.bySkill[skillType].fulfillmentRate = 
              data.totalHired && data.totalCreated ? 
              Math.round((data.totalHired / data.totalCreated) * 100) : 0;
              
            if (data.avgFulfillmentTime) {
              p.metrics.bySkill[skillType].avgFulfillmentTime = data.avgFulfillmentTime;
            }
          }
        });
      } else if (provinceData[province]) {
        if (skillType === 'overall') {
          // Overall province metrics
          provinceData[province].metrics.fulfillmentRate = 
            data.totalHired && data.totalCreated ? 
            Math.round((data.totalHired / data.totalCreated) * 100) : 0;
            
          if (data.avgFulfillmentTime) {
            provinceData[province].metrics.avgFulfillmentTime = data.avgFulfillmentTime;
          }
        } else if (provinceData[province].metrics.bySkill[skillType]) {
          provinceData[province].metrics.bySkill[skillType].fulfillmentRate = 
            data.totalHired && data.totalCreated ? 
            Math.round((data.totalHired / data.totalCreated) * 100) : 0;
            
          if (data.avgFulfillmentTime) {
            provinceData[province].metrics.bySkill[skillType].avgFulfillmentTime = data.avgFulfillmentTime;
          }
        }
      }
    });

    // Process employee registration data
    employeeRegSnapshot.forEach(doc => {
      const [skillType, province] = doc.id.split('_');
      const data = doc.data();
      
      if (province === 'overall') {
        // Update all provinces for this skill type
        Object.values(provinceData).forEach(p => {
          if (!p.metrics.bySkill[skillType]) {
            p.metrics.bySkill[skillType] = {
              jobSeekers: 0
            };
          }
        });
      } else if (provinceData[province]) {
        if (skillType === 'overall') {
          // Overall province metrics
          provinceData[province].metrics.jobSeekers += data.totalRegistered || 0;
        } else {
          // Skill-specific metrics
          if (!provinceData[province].metrics.bySkill[skillType]) {
            provinceData[province].metrics.bySkill[skillType] = {
              jobSeekers: 0
            };
          }
          provinceData[province].metrics.bySkill[skillType].jobSeekers += data.totalRegistered || 0;
        }
      }
    });

    // Process employer registration data
    employerRegSnapshot.forEach(doc => {
      const [_, province] = doc.id.split('_');
      const data = doc.data();
      
      if (province !== 'overall' && provinceData[province]) {
        provinceData[province].metrics.employers += data.totalRegistered || 0;
      }
    });

    // Calculate top skills for each province
    Object.keys(provinceData).forEach(province => {
      const skills = Object.entries(provinceData[province].metrics.bySkill)
        .map(([skill, data]) => ({
          skill,
          demandScore: data.activeJobs * 0.6 + data.jobSeekers * 0.4
        }))
        .sort((a, b) => b.demandScore - a.demandScore)
        .slice(0, 5);
      
      provinceData[province].topSkills = skills;
    });

    // Calculate summary statistics for the cards
    updateSummaryCards();
    updateTopProvincesCards();
    updateTopSkillsCards();
    
    // Render the initial map
    renderMapWithMetric(currentMetric);
    
  } catch (error) {
    console.error("Error loading data:", error);
    showError("Failed to load data. Please refresh the page.");
    throw error;
  }
}

function renderMapWithMetric(metric) {
  // Clear existing labels
  if (window.provinceLabels) {
    window.provinceLabels.forEach(label => label.setMap(null));
  }
  window.provinceLabels = [];

  // Calculate min/max values for the color scale
  let minValue = Infinity;
  let maxValue = -Infinity;
  
  Object.values(provinceData).forEach(province => {
    const value = currentSkillFilter === 'all' 
      ? province.metrics[metric] || 0
      : province.metrics.bySkill[currentSkillFilter]?.[metric] || 0;
    
    if (!isNaN(value)) {
      if (value < minValue) minValue = value;
      if (value > maxValue) maxValue = value;
    }
  });

  // Special cases for percentage metrics
  if (metric === 'fulfillmentRate') {
    minValue = 0;
    maxValue = 100;
  }

  // Render each province label
  Object.entries(provinceData).forEach(([name, data]) => {
    const value = currentSkillFilter === 'all' 
      ? data.metrics[metric] || 0
      : data.metrics.bySkill[currentSkillFilter]?.[metric] || 0;
    
    // Handle special display for different metrics
    let displayValue;
    if (metric === 'fulfillmentRate') {
      displayValue = `${value}%`;
    } else if (metric === 'avgFulfillmentTime') {
      const days = Math.round(value / (24 * 60 * 60));
      displayValue = `${days}d`;
    } else {
      displayValue = value >= 1000 ? 
        `${(value / 1000).toFixed(1)}k` : 
        value.toString();
    }
    
    // Calculate color based on value
    const color = getColorForValue(value, minValue, maxValue, metric);
    
    // Add clickable label
    addProvinceLabel(name, data.center, displayValue, color);
  });
}

function addProvinceLabel(name, position, value = '', color = '#7FD33B') {
  // Create the label marker with colored dot and text
  const labelMarker = new google.maps.Marker({
    position: position,
    map: map,
    icon: {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
        `<svg width="140" height="32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="16" r="10" fill="${color}"/>
          <rect x="24" width="116" height="32" rx="16" fill="rgba(255,255,255,0.9)"/>
          <text x="82" y="18" font-family="Arial" font-size="12" 
                font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#333">
            ${name}${value ? `: ${value}` : ''}
          </text>
        </svg>`
      )}`,
      anchor: new google.maps.Point(12, 16)
    },
    zIndex: 999,
    optimized: false
  });

  // Store reference to remove later
  if (!window.provinceLabels) window.provinceLabels = [];
  window.provinceLabels.push(labelMarker);

  // Add click event
  labelMarker.addListener('click', () => selectProvince(name));
}

function selectProvince(name) {
  selectedProvince = name;
  
  // Update the info panel
  updateProvinceInfoPanel(name);
  
  // Center the map on the selected province
  if (provinceData[name] && provinceData[name].center) {
    map.panTo(provinceData[name].center);
    map.setZoom(8);
  }
}

function updateProvinceInfoPanel(provinceName) {
  const province = provinceData[provinceName];
  if (!province) return;
  
  document.getElementById('selectedProvince').textContent = provinceName;
  
  const metrics = currentSkillFilter === 'all' 
    ? province.metrics 
    : province.metrics.bySkill[currentSkillFilter] || {};
  
  // Calculate total demand for percentage calculation
  const totalDemand = province.topSkills.reduce((sum, skill) => sum + skill.demandScore, 0);
  
  const statsContainer = document.getElementById('provinceStats');
  statsContainer.innerHTML = `
    <div class="space-y-4">
      <div>
        <p class="text-m"><strong>${formatNumber(metrics.activeJobs || 0)}</strong> Active Jobs</p>
      </div>
      
      <div>
        <p class="text-m"><strong>${formatNumber(metrics.jobSeekers || 0)}</strong> Available Workers</p>
      </div>
      
      <div class="pt-4 border-t">
        <h4 class="font-medium mb-2">Top In-Demand Skills</h4>
        <div class="flex flex-wrap gap-2" id="provinceTopSkills">
          ${province.topSkills.slice(0, 5).map(skill => {
            const percentage = totalDemand > 0 ? Math.round((skill.demandScore / totalDemand) * 100) : 0;
            return `
              <div class="skill-badge cursor-pointer" data-skill="${skill.skill}">
                ${skill.skill} <span class="text-xs font-normal">(${percentage}%)</span>
                <i class="fas fa-info-circle ml-1"></i>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <br>
      <div class="mt-auto pt-4 border-t">
      <button id="analyzeBtn" class="w-full mt-4 bg-blue-50 hover:bg-blue-100 text-blue-800 px-4 py-2 rounded-lg flex items-center justify-start gap-2 transition-colors cursor-pointer">
        <i class="fas fa-robot"></i>
        Analyze this data
      </button>
      </div>
    </div>
  `;
  
  // Add click handlers for skill badges
  document.querySelectorAll('#provinceTopSkills .skill-badge').forEach(badge => {
    badge.addEventListener('click', (e) => {
      const skill = e.currentTarget.dataset.skill;
      showSkillDetails(provinceName, skill);
    });
  });
  
  // Add click handler for analyze button
  document.getElementById('analyzeBtn').addEventListener('click', () => {
    analyzeProvinceData(provinceName);
  });
}

function formatNumber(num) {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k+`;
  }
  return num.toString();
}

async function showSkillDetails(province, skill) {
  const skillData = provinceData[province].metrics.bySkill[skill] || {};
  
  // Create modal content
  const content = `
    <div class="p-4">
      <h3 class="text-lg font-bold mb-2">${skill} in ${province}</h3>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div class="bg-gray-50 p-3 rounded">
          <p class="text-sm text-gray-500">Active Jobs</p>
          <p class="font-bold">${formatNumber(skillData.activeJobs || 0)}</p>
        </div>
        <div class="bg-gray-50 p-3 rounded">
          <p class="text-sm text-gray-500">Available Workers</p>
          <p class="font-bold">${formatNumber(skillData.jobSeekers || 0)}</p>
        </div>
        <div class="bg-gray-50 p-3 rounded">
          <p class="text-sm text-gray-500">Fulfillment Rate</p>
          <p class="font-bold">${skillData.fulfillmentRate || 0}%</p>
        </div>
        <div class="bg-gray-50 p-3 rounded">
          <p class="text-sm text-gray-500">Avg. Fulfillment Time</p>
          <p class="font-bold">${skillData.avgFulfillmentTime ? 
            Math.round(skillData.avgFulfillmentTime / (24 * 60 * 60)) + ' days' : 'N/A'}</p>
        </div>
      </div>
      
      <button id="getTrainingBtn" class="w-full bg-green-100 text-green-800 py-2 rounded-lg mt-2">
        <i class="fas fa-graduation-cap"></i> Find Training Programs
      </button>
    </div>
  `;
  
  // Show modal (you'll need to implement your modal system)
  showModal(content);
  
  // Add training button handler
  document.getElementById('getTrainingBtn')?.addEventListener('click', () => {
    getTrainingRecommendations(skill, province);
  });
}

async function analyzeProvinceData(provinceName) {
  const province = provinceData[provinceName];
  if (!province) return;

  const metrics = province.metrics;
  const topSkills = province.topSkills.map(s => s.skill);

  try {
    const response = await fetch('https://asia-southeast1-careerstep-bpsu1.cloudfunctions.net/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        province: provinceName,
        activeJobs: metrics.activeJobs,
        jobSeekers: metrics.jobSeekers,
        fulfillmentRate: metrics.fulfillmentRate,
        topSkills: topSkills
      })
    });
    
    if (!response.ok) throw new Error('Network response was not ok');
    
    const analysis = await response.json();
    
    // Format the response with proper styling
    const formattedResponse = formatAnalysisResponse(analysis.content, provinceName);
    
    showModal(`
      <div class="space-y-6">
        <div class="flex justify-between items-center border-b pb-2">
          <h3 class="text-xl font-bold text-[#315E26]">Analysis for ${provinceName}</h3>
          <span class="text-sm text-gray-500">${new Date().toLocaleDateString()}</span>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-sm text-gray-500">Active Jobs</p>
            <p class="font-bold text-2xl">${formatNumber(metrics.activeJobs || 0)}</p>
          </div>
          <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-sm text-gray-500">Available Workers</p>
            <p class="font-bold text-2xl">${formatNumber(metrics.jobSeekers || 0)}</p>
          </div>
          <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-sm text-gray-500">Fulfillment Rate</p>
            <p class="font-bold text-2xl ${metrics.fulfillmentRate > 50 ? 'text-green-600' : 'text-red-600'}">
              ${metrics.fulfillmentRate || 0}%
            </p>
          </div>
          <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-sm text-gray-500">Top Skills</p>
            <div class="flex flex-wrap gap-1 mt-2">
              ${topSkills.slice(0, 3).map(skill => `
                <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">${skill}</span>
              `).join('')}
            </div>
          </div>
        </div>
        
        ${formattedResponse}
      </div>
    `);
    
  } catch (error) {
    console.error('Error getting analysis:', error);
    showModal(`
      <div class="p-6 text-center">
        <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
        <h3 class="text-lg font-bold text-red-600 mb-2">Analysis Failed</h3>
        <p class="text-gray-600">Could not get analysis. Please try again later.</p>
        <button class="mt-4 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200">
          Retry
        </button>
      </div>
    `);
  }
}

function formatAnalysisResponse(text, provinceName) {
  // Convert to proper sections with styling
  const sections = text.split('\n\n').filter(section => section.trim());
  
  return sections.map(section => {
    if (section.startsWith('**Key Metrics:**')) {
      return ''; // We're showing metrics separately now
    } else if (section.startsWith('**Analysis:**')) {
      const points = section.replace('**Analysis:**', '').trim().split('\n');
      return `
        <div class="bg-blue-50 p-4 rounded-lg">
          <h4 class="font-bold text-blue-800 mb-3 flex items-center">
            <i class="fas fa-chart-line mr-2"></i> Key Insights
          </h4>
          <ul class="list-disc pl-5 space-y-2">
            ${points.filter(p => p.trim()).map(p => `
              <li class="text-gray-700">${p.replace(/^-\s*/, '').trim()}</li>
            `).join('')}
          </ul>
        </div>
      `;
    } else if (section.startsWith('**Training Programs:**')) {
      const programs = section.replace('**Training Programs:**', '').trim().split('\n');
      return `
        <div class="mt-4 border-t pt-4">
          <h4 class="font-bold text-[#315E26] mb-3 flex items-center">
            <i class="fas fa-graduation-cap mr-2"></i> Training Recommendations
          </h4>
          <div class="space-y-3">
            ${programs.filter(p => p.trim()).map(p => {
              const match = p.match(/-\s*(.*?):\s*(.*?)\s*\|\s*(.*)/);
              if (match) {
                return `
                  <div class="border-l-4 border-[#315E26] pl-3 py-1 bg-gray-50 rounded-r">
                    <p class="font-medium text-gray-800">${match[1].trim()}</p>
                    <p class="text-sm text-gray-600 flex items-center">
                      <i class="fas fa-map-marker-alt mr-1 text-xs"></i> ${match[2].trim()}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">${match[3].trim()}</p>
                  </div>
                `;
              }
              return `
                <div class="border-l-4 border-gray-300 pl-3 py-1">
                  <p class="text-sm text-gray-600">${p.replace(/^-\s*/, '').trim()}</p>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
    return `
      <div class="prose max-w-none mt-4 p-4 bg-gray-50 rounded-lg">
        ${section.replace(/\n/g, '<br>')}
      </div>
    `;
  }).join('');
}

async function getTrainingRecommendations(skill, location) {
  try {
    const response = await fetch('https://asia-southeast1-careerstep-bpsu1.cloudfunctions.net/getTrainingRecommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ skill, location })
    });
    
    const training = await response.json();
    
    // Format the training programs display
    const formattedContent = formatTrainingResponse(training.content);
    
    showModal(`
      <div class="p-4">
        <h3 class="text-xl font-bold text-[#315E26] mb-4">Training for ${skill} in ${location}</h3>
        <div class="space-y-4">
          ${formattedContent}
        </div>
      </div>
    `);
    
  } catch (error) {
    console.error('Error getting training:', error);
    showModal(`
      <div class="p-4">
        <h3 class="text-lg font-bold text-red-600 mb-2">Training Info Failed</h3>
        <p>Could not get training information. Please try again later.</p>
      </div>
    `);
  }
}

function formatTrainingResponse(text) {
  // Split into sections
  const sections = text.split('<br><br>').filter(section => section.trim());
  
  return sections.map(section => {
    if (section.includes('Local Programs')) {
      return `
        <div class="bg-blue-50 p-4 rounded-lg">
          <h4 class="font-bold text-blue-800 mb-2 flex items-center">
            <i class="fas fa-map-marker-alt mr-2"></i> Local Programs
          </h4>
          ${formatTrainingItems(section.replace('Local Programs', ''))}
        </div>
      `;
    } else if (section.includes('Nearby Options')) {
      return `
        <div class="bg-green-50 p-4 rounded-lg">
          <h4 class="font-bold text-green-800 mb-2 flex items-center">
            <i class="fas fa-location-arrow mr-2"></i> Nearby Options
          </h4>
          ${formatTrainingItems(section.replace('Nearby Options', ''))}
        </div>
      `;
    } else if (section.includes('National Programs')) {
      return `
        <div class="bg-purple-50 p-4 rounded-lg">
          <h4 class="font-bold text-purple-800 mb-2 flex items-center">
            <i class="fas fa-globe-americas mr-2"></i> National Programs
          </h4>
          ${formatTrainingItems(section.replace('National Programs', ''))}
        </div>
      `;
    }
    return `<div class="prose">${section}</div>`;
  }).join('');
}

function formatTrainingItems(section) {
  const items = section.split('<br>').filter(item => item.trim());
  
  if (items.length === 1 && items[0].includes("No ")) {
    return `<p class="text-gray-600">${items[0]}</p>`;
  }
  
  return `
    <ul class="list-disc pl-5 space-y-2">
      ${items.map(item => {
        // Format each training program item
        const parts = item.split('|').map(p => p.trim());
        if (parts.length >= 2) {
          return `
            <li class="text-gray-700">
              <span class="font-medium">${parts[0].replace('•', '').trim()}</span>
              ${parts.length > 1 ? `<p class="text-sm text-gray-600">${parts[1]}</p>` : ''}
            </li>
          `;
        }
        return `<li class="text-gray-700">${item.replace('•', '').trim()}</li>`;
      }).join('')}
    </ul>
  `;
}

function updateSummaryCards() {
  // Calculate totals across all provinces
  let totalJobs = 0;
  let activeJobs = 0;
  let jobSeekers = 0;
  let employers = 0;
  let totalHired = 0;
  let totalCreated = 0;
  
  Object.values(provinceData).forEach(province => {
    totalJobs += province.metrics.totalJobs || 0;
    activeJobs += province.metrics.activeJobs || 0;
    jobSeekers += province.metrics.jobSeekers || 0;
    employers += province.metrics.employers || 0;
    
    // For fulfillment rate, we need to calculate across all jobs
    if (province.metrics.bySkill) {
      Object.values(province.metrics.bySkill).forEach(skillData => {
        totalCreated += skillData.totalJobs || 0;
        totalHired += Math.round(((skillData.fulfillmentRate || 0) / 100) * (skillData.totalJobs || 0));
      });
    }
  });
  
  const fulfillmentRate = totalCreated > 0 ? Math.round((totalHired / totalCreated) * 100) : 0;
  
  // Update the cards with rounded numbers
  document.getElementById('totalJobsCount').textContent = formatNumber(totalJobs);
  document.getElementById('activeJobsCount').textContent = formatNumber(activeJobs);
  document.getElementById('availableWorkersCount').textContent = formatNumber(jobSeekers);
  document.getElementById('fulfillmentRateCount').textContent = fulfillmentRate + '%';
}

function populateSkillFilter(skills) {
  const skillFilter = document.getElementById('skillFilter');
  
  // Clear existing options except "All Skills"
  while (skillFilter.options.length > 1) {
    skillFilter.remove(1);
  }
  
  // Add skills to the filter
  skills.sort();
  skills.forEach(skill => {
    const option = document.createElement('option');
    option.value = skill;
    option.textContent = skill;
    skillFilter.appendChild(option);
  });
}

function getColorForValue(value, minValue, maxValue, metric) {
  if (metric === 'fulfillmentRate') {
    // Special color scale for percentages (0-100)
    if (value >= 80) return '#7FD33B'; // Green
    if (value >= 60) return '#FFEA05'; // Yellow
    if (value >= 40) return '#D3733B'; // Orange
    return '#D33B3B'; // Red
  }
  
  // For other metrics, use quartile-based coloring
  const range = maxValue - minValue;
  if (range === 0) return '#7FD33B'; // All same value
  
  const normalized = (value - minValue) / range;
  
  if (normalized >= 0.75) return '#D33B3B'; // Red
  if (normalized >= 0.5) return '#D3733B'; // Orange
  if (normalized >= 0.25) return '#FFEA05'; // Yellow
  return '#7FD33B'; // Green
}

function getFulfillmentRateColorClass(rate) {
  if (rate >= 80) return 'bg-green-500';
  if (rate >= 60) return 'bg-yellow-500';
  if (rate >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function setupUI() {
  // Metric selector
  document.getElementById('heatmapMetric').addEventListener('change', (e) => {
    currentMetric = e.target.value;
    renderMapWithMetric(currentMetric);
    
    // Update info panel if a province is selected
    if (selectedProvince) {
      updateProvinceInfoPanel(selectedProvince);
    }
  });
  
  // Skill filter
  document.getElementById('skillFilter').addEventListener('change', (e) => {
    currentSkillFilter = e.target.value;
    renderMapWithMetric(currentMetric);
    
    // Update info panel if a province is selected
    if (selectedProvince) {
      updateProvinceInfoPanel(selectedProvince);
    }
  });
  
  // Reset view button
  document.getElementById('resetViewBtn').addEventListener('click', () => {
    const northLuzonBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(14.0, 119.5),
      new google.maps.LatLng(21.0, 122.5)
    );
    map.fitBounds(northLuzonBounds);
    map.setZoom(7);
  });
  
  // Search functionality
  const searchInput = document.getElementById('provinceSearch');
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    if (searchTerm.length >= 3) {
      const matchingProvinces = Object.keys(provinceData)
        .filter(name => name.toLowerCase().includes(searchTerm))
        .sort((a, b) => a.length - b.length);
      
      if (matchingProvinces.length > 0) {
        selectProvince(matchingProvinces[0]);
      }
    }
  });
  
  // Card click handlers
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
      const metric = card.dataset.metric;
      document.getElementById('heatmapMetric').value = metric;
      currentMetric = metric;
      renderMapWithMetric(currentMetric);
    });
  });
  
  // Export button
  document.getElementById('exportBtn').addEventListener('click', () => {
    exportProvinceData();
  });
   let chatSessionId = null;
  
  // Initialize chat session
 async function initChatSession() {
  try {
    // First upload the HRINA data
    await uploadHirnaData();
    
    // Then initialize the chat session
    const response = await fetch('https://asia-southeast1-careerstep-bpsu1.cloudfunctions.net/initChatSession', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      chatSessionId = data.session_id;
      return data.session_id;
    }
    throw new Error('Failed to initialize chat session');
  } catch (error) {
    console.error('Error initializing chat session:', error);
    throw error;
  }
}

// Update the message sending function
async function sendChatMessage(message, context) {
  try {
    const response = await fetch('https://asia-southeast1-careerstep-bpsu1.cloudfunctions.net/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: message,
        context: {
          ...context,
          collection: "hirna_data"
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    throw new Error('Failed to get response');
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}
  
// Toggle chatbot
document.getElementById('chatbotBtn').addEventListener('click', async () => {
  const modal = document.getElementById('chatbotModal');
  modal.classList.toggle('hidden');
  
  if (!modal.classList.contains('hidden')) {
    // Initialize chat if not already done
    if (!chatSessionId) {
      try {
        chatSessionId = await initChatSession();
        addChatMessage('assistant', 'Hello! I\'m your HirNa assistant. How can I help you with North Luzon workforce data?');
      } catch (error) {
        addChatMessage('assistant', 'Sorry, I couldn\'t initialize the chat. Please try again later.');
        console.error('Chat initialization error:', error);
      }
    }
  }
});

// Close chatbot
document.getElementById('closeChatbot').addEventListener('click', () => {
  document.getElementById('chatbotModal').classList.add('hidden');
});

// Send message handler
document.getElementById('sendChatbotMsg').addEventListener('click', async () => {
  const input = document.getElementById('chatbotInput');
  const message = input.value.trim();
  if (!message) return;
  
  // Add user message to chat
  addChatMessage('user', message);
  input.value = '';
  
  try {
    const response = await sendChatMessage(message, {
      selectedProvince,
      currentMetric,
      currentSkillFilter
    });
    addChatMessage('assistant', response.content);
  } catch (error) {
    addChatMessage('assistant', 'Sorry, I encountered an error. Please try again later.');
  }
});
  
  
  // Helper function to add messages to chat
  // Helper function to add messages to chat
function addChatMessage(role, content) {
  const messagesDiv = document.getElementById('chatbotMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `mb-3 ${role === 'user' ? 'text-right' : 'text-left'}`;
  
  const bubble = document.createElement('div');
  bubble.className = `inline-block px-4 py-2 rounded-lg max-w-[80%] ${role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`;
  
  // Format the content
  const formattedContent = content
    .replace(/<strong>(.*?)<\/strong>/g, '<span class="font-bold">$1</span>')
    .replace(/•/g, '•')
    .replace(/<br>/g, '<br>');
  
  bubble.innerHTML = formattedContent;
  
  messageDiv.appendChild(bubble);
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
}

function exportProvinceData() {
  if (!selectedProvince) {
    alert('Please select a province first');
    return;
  }
  
  const province = provinceData[selectedProvince];
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Add header
  csvContent += "Metric,Value\n";
  
  // Add overall metrics
  csvContent += `Total Jobs,${province.metrics.totalJobs}\n`;
  csvContent += `Active Jobs,${province.metrics.activeJobs}\n`;
  csvContent += `Available Workers,${province.metrics.jobSeekers}\n`;
  csvContent += `Registered Employers,${province.metrics.employers}\n`;
  csvContent += `Job Fulfillment Rate,${province.metrics.fulfillmentRate}%\n`;
  csvContent += `Avg. Fulfillment Time,${province.metrics.avgFulfillmentTime ? 
    Math.round(province.metrics.avgFulfillmentTime / (24 * 60 * 60)) + ' days' : 'N/A'}\n`;
  
  // Add skill-specific metrics if available
  if (Object.keys(province.metrics.bySkill).length > 0) {
    csvContent += "\nSkill-Specific Metrics\n";
    csvContent += "Skill,Total Jobs,Active Jobs,Available Workers,Fulfillment Rate,Avg. Fulfillment Time\n";
    
    Object.entries(province.metrics.bySkill).forEach(([skill, data]) => {
      csvContent += `${skill},${data.totalJobs || 0},${data.activeJobs || 0},${data.jobSeekers || 0},${data.fulfillmentRate || 0}%,${data.avgFulfillmentTime ? 
        Math.round(data.avgFulfillmentTime / (24 * 60 * 60)) + ' days' : 'N/A'}\n`;
    });
  }
  
  // Create download link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${selectedProvince}_workforce_data.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'map-error';
  errorDiv.innerHTML = `
    <i class="fas fa-exclamation-triangle"></i>
    <span>${message}</span>
  `;
  document.getElementById('northLuzonMap').appendChild(errorDiv);

}

function updateTopProvincesCards() {
    // Sort provinces by total jobs
    const provincesByJobs = Object.entries(provinceData)
        .map(([name, data]) => ({
            name,
            value: data.metrics.totalJobs || 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    
    // Calculate total jobs for percentage calculation
    const totalJobs = provincesByJobs.reduce((sum, p) => sum + p.value, 0);
    
    // Sort provinces by available workers
    const provincesByWorkers = Object.entries(provinceData)
        .map(([name, data]) => ({
            name,
            value: data.metrics.jobSeekers || 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    
    // Calculate total workers for percentage calculation
    const totalWorkers = provincesByWorkers.reduce((sum, p) => sum + p.value, 0);
    
    // Update top provinces by jobs
    const topJobsContainer = document.getElementById('topProvincesJobs');
    topJobsContainer.innerHTML = provincesByJobs.map((province, index) => {
        const percentage = totalJobs > 0 ? Math.round((province.value / totalJobs) * 100) : 0;
        return `
        <div class="flex justify-between items-center py-1 border-b border-gray-100">
            <div class="flex items-center gap-2">
                <span class="font-medium text-gray-700">${index + 1}.</span>
                <span>${province.name}</span>
            </div>
            <span class="font-semibold">${formatNumber(province.value)} (${percentage}%)</span>
        </div>
        `;
    }).join('');
    
    // Update top provinces by workers (percentages only)
    const topWorkersContainer = document.getElementById('topProvincesWorkers');
    topWorkersContainer.innerHTML = provincesByWorkers.map((province, index) => {
        const percentage = totalWorkers > 0 ? Math.round((province.value / totalWorkers) * 100) : 0;
        return `
        <div class="flex justify-between items-center py-1 border-b border-gray-100">
            <div class="flex items-center gap-2">
                <span class="font-medium text-gray-700">${index + 1}.</span>
                <span>${province.name}</span>
            </div>
            <span class="font-semibold">${percentage}%</span>
        </div>
        `;
    }).join('');
    
    // Update market insights
    updateMarketInsights(provincesByJobs, provincesByWorkers);
}

function updateTopSkillsCards() {
    // Aggregate skills across all provinces
    const skillDemand = {};
    
    Object.values(provinceData).forEach(province => {
        Object.entries(province.metrics.bySkill).forEach(([skill, data]) => {
            if (!skillDemand[skill]) {
                skillDemand[skill] = {
                    activeJobs: 0,
                    jobSeekers: 0,
                    fulfillmentRate: 0,
                    count: 0
                };
            }
            skillDemand[skill].activeJobs += data.activeJobs || 0;
            skillDemand[skill].jobSeekers += data.jobSeekers || 0;
            skillDemand[skill].fulfillmentRate += data.fulfillmentRate || 0;
            skillDemand[skill].count++;
        });
    });
    
    // Calculate average fulfillment rate per skill
    Object.keys(skillDemand).forEach(skill => {
        skillDemand[skill].fulfillmentRate = skillDemand[skill].count > 0 ? 
            Math.round(skillDemand[skill].fulfillmentRate / skillDemand[skill].count) : 0;
    });
    
    // Get top 10 skills by demand (active jobs)
    const topSkills = Object.entries(skillDemand)
        .map(([skill, data]) => ({
            skill,
            activeJobs: data.activeJobs,
            jobSeekers: data.jobSeekers,
            fulfillmentRate: data.fulfillmentRate,
            demandScore: data.activeJobs * 0.6 + data.jobSeekers * 0.4
        }))
        .sort((a, b) => b.demandScore - a.demandScore)
        .slice(0, 10);
    
    // Calculate total demand for percentages
    const totalDemand = topSkills.reduce((sum, skill) => sum + skill.demandScore, 0);
    
    // Update top skills demand list
    const topSkillsContainer = document.getElementById('topSkillsDemand');
    topSkillsContainer.innerHTML = topSkills.map((skillData, index) => {
        const percentage = totalDemand > 0 ? Math.round((skillData.demandScore / totalDemand) * 100) : 0;
        return `
        <div class="flex justify-between items-center py-1 border-b border-gray-100">
            <div class="flex items-center gap-2">
                <span class="font-medium text-gray-700">${index + 1}.</span>
                <span>${skillData.skill}</span>
            </div>
            <div class="flex flex-col items-end">
                <span class="text-xs font-semibold">${percentage}% of total demand</span>
                <span class="text-sm text-gray-500">${formatNumber(skillData.activeJobs)} jobs</span>
            </div>
        </div>
        `;
    }).join('');
    
    // Update skills analysis
    updateSkillsAnalysis(topSkills);
}

function updateMarketInsights(topJobsProvinces, topWorkersProvinces) {
    const insightsContainer = document.getElementById('marketInsights');
    
    // Calculate some basic insights
    const totalJobs = topJobsProvinces.reduce((sum, p) => sum + p.value, 0);
    const totalWorkers = topWorkersProvinces.reduce((sum, p) => sum + p.value, 0);
    
    const jobsConcentration = (topJobsProvinces[0].value / totalJobs * 100).toFixed(1);
    const workersConcentration = (topWorkersProvinces[0].value / totalWorkers * 100).toFixed(1);
    
    const imbalance = topJobsProvinces.some(p => 
        !topWorkersProvinces.some(w => w.name === p.name)
    ) ? "exists" : "balanced";
    
    insightsContainer.innerHTML = `
        <div class="space-y-3">
            <div>
                <h4 class="font-medium">Job Concentration</h4>
                <p>${topJobsProvinces[0].name} accounts for ${jobsConcentration}% of all job listings in the top 5 provinces.</p>
            </div>
            
            <div>
                <h4 class="font-medium">Workforce Distribution</h4>
                <p>${topWorkersProvinces[0].name} has the largest workforce, representing ${workersConcentration}% of available workers in the top 5.</p>
            </div>
            
            <div>
                <h4 class="font-medium">Market Balance</h4>
                <p>The job market is ${imbalance === "exists" ? "imbalanced" : "relatively balanced"} with ${imbalance === "exists" ? "some" : "no"} mismatches between job locations and worker locations.</p>
            </div>
            
            <div>
                <h4 class="font-medium">Recommendations</h4>
                <ul class="list-disc pl-5">
                    <li>Focus recruitment efforts in ${topWorkersProvinces[0].name} for available talent</li>
                    <li>Consider expanding job postings in ${topJobsProvinces[0].name} to attract more workers</li>
                    <li>Monitor fulfillment rates to identify skills gaps</li>
                </ul>
            </div>
        </div>
    `;
}

function updateSkillsAnalysis(topSkills) {
    const analysisContainer = document.getElementById('skillsAnalysis');
    
    // Calculate some basic insights
    const highestDemandSkill = topSkills[0];
    const lowestFulfillmentSkill = [...topSkills].sort((a, b) => 
        a.fulfillmentRate - b.fulfillmentRate
    )[0];
    const balancedSkills = topSkills.filter(s => 
        s.fulfillmentRate >= 40 && s.fulfillmentRate <= 60
    );
    
    analysisContainer.innerHTML = `
        <div class="space-y-3">
            <div>
                <h4 class="font-medium">Highest Demand</h4>
                <p>${highestDemandSkill.skill} is the most in-demand skill with ${highestDemandSkill.activeJobs} active jobs and ${highestDemandSkill.jobSeekers} available workers.</p>
            </div>
            
            <div>
                <h4 class="font-medium">Fulfillment Challenges</h4>
                <p>${lowestFulfillmentSkill.skill} has the lowest fulfillment rate at ${lowestFulfillmentSkill.fulfillmentRate}%, indicating potential shortages.</p>
            </div>
            
            <div>
                <h4 class="font-medium">Balanced Skills</h4>
                <p>${balancedSkills.length} skills show balanced supply and demand with fulfillment rates between 40-60%.</p>
            </div>
            
            <div>
                <h4 class="font-medium">Training Opportunities</h4>
                <p>Consider offering training programs for ${lowestFulfillmentSkill.skill} to address the workforce shortage.</p>
            </div>
        </div>
    `;
}

function showModal(content) {
  // Remove any existing modal first
  const existingModal = document.querySelector('.modal-content');
  if (existingModal) existingModal.remove();

  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'modal-content';
  
  // Modal content
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
      <div class="bg-[#315E26] text-white p-4 flex justify-between items-center">
        <h3 class="text-lg font-bold">Analysis Details</h3>
        <button class="text-white hover:text-gray-200 focus:outline-none modal-close-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="p-6 overflow-y-auto flex-1">
        ${content}
      </div>
    </div>
  `;

  // Add to document
  document.body.appendChild(modal);

  // Close handler
  const closeBtn = modal.querySelector('.modal-close-btn');
  const closeModal = () => {
    modal.remove();
  };
  
  closeBtn.addEventListener('click', closeModal);

  // Escape key handler
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
}

async function uploadHirnaData() {
  try {
    // Validate data first
    const provinces = Object.keys(provinceData);
    if (provinces.length === 0) {
      throw new Error('No province data available to upload');
    }

    console.log('Preparing to upload data for provinces:', provinces);

    // Generate the data text
    const hirnaDataText = generateHirnaDataText();
    
    // Debug: Verify content
    console.log('Data sample:', hirnaDataText.substring(0, 500) + '...');
    
    // Upload with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch('https://asia-southeast1-careerstep-bpsu1.cloudfunctions.net//uploadHirnaData', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: hirnaDataText }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorDetails}`);
    }

    const result = await response.json();
    console.log('Upload successful. Backend response:', result);
    return true;
  } catch (error) {
    console.error('Upload error:', error);
    showError(`Data upload failed: ${error.message}`);
    return false;
  }
}

function generateHirnaDataText() {
  let text = "HRINA Workforce Data\n\n";
  
  // Add timestamp
  text += `Last Updated: ${new Date().toISOString()}\n\n`;
  
  // Add summary
  text += "## Region Summary\n";
  text += `- Total Provinces: ${Object.keys(provinceData).length}\n`;
  text += `- Total Active Jobs: ${Object.values(provinceData)
    .reduce((sum, p) => sum + (p.metrics.activeJobs || 0), 0)}\n\n`;
  
  // Add detailed province data
  text += "## Province Details\n";
  for (const [name, data] of Object.entries(provinceData)) {
    text += `### ${name}\n`;
    text += `- Active Jobs: ${data.metrics.activeJobs || 0}\n`;
    text += `- Job Seekers: ${data.metrics.jobSeekers || 0}\n`;
    text += `- Fulfillment Rate: ${data.metrics.fulfillmentRate || 0}%\n`;
    
    if (data.topSkills?.length > 0) {
      text += `- Top Skills: ${data.topSkills.map(s => s.skill).join(', ')}\n`;
    }
    text += '\n';
  }
  
  return text;
}

// Make initMap available globally
window.initMap = initMap;