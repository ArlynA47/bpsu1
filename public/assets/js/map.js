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
  
  const statsContainer = document.getElementById('provinceStats');
  statsContainer.innerHTML = `
    <div class="stat-card bg-gray-50 p-3 rounded-lg">
      <h4 class="text-sm font-medium text-gray-500">Total Jobs</h4>
      <p class="text-2xl font-bold">${metrics.totalJobs?.toLocaleString() || 'N/A'}</p>
    </div>
    <div class="stat-card bg-gray-50 p-3 rounded-lg">
      <h4 class="text-sm font-medium text-gray-500">Active Jobs</h4>
      <p class="text-2xl font-bold">${metrics.activeJobs?.toLocaleString() || 'N/A'}</p>
    </div>
    <div class="stat-card bg-gray-50 p-3 rounded-lg">
      <h4 class="text-sm font-medium text-gray-500">Available Workers</h4>
      <p class="text-2xl font-bold">${metrics.jobSeekers?.toLocaleString() || 'N/A'}</p>
    </div>
    <div class="stat-card bg-gray-50 p-3 rounded-lg">
      <h4 class="text-sm font-medium text-gray-500">Registered Employers</h4>
      <p class="text-2xl font-bold">${currentSkillFilter === 'all' ? province.metrics.employers?.toLocaleString() || 'N/A' : 'N/A'}</p>
    </div>
    <div class="stat-card bg-gray-50 p-3 rounded-lg col-span-2">
      <h4 class="text-sm font-medium text-gray-500">Job Fulfillment Rate</h4>
      <div class="flex items-center gap-2">
        <p class="text-2xl font-bold">${metrics.fulfillmentRate?.toLocaleString() || '0'}%</p>
        <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div class="h-full ${getFulfillmentRateColorClass(metrics.fulfillmentRate || 0)}" 
               style="width: ${metrics.fulfillmentRate || 0}%"></div>
        </div>
      </div>
    </div>
    ${currentMetric === 'avgFulfillmentTime' ? `
    <div class="stat-card bg-gray-50 p-3 rounded-lg col-span-2">
      <h4 class="text-sm font-medium text-gray-500">Avg. Fulfillment Time</h4>
      <p class="text-2xl font-bold">${metrics.avgFulfillmentTime ? 
        Math.round(metrics.avgFulfillmentTime / (24 * 60 * 60)) + ' days' : 'N/A'}</p>
    </div>
    ` : ''}
  `;
  
  // Update top skills
  const topSkillsContainer = document.getElementById('topSkills');
  topSkillsContainer.innerHTML = '';
  
  const skillsToShow = currentSkillFilter === 'all' 
    ? province.topSkills 
    : [{ skill: currentSkillFilter, demandScore: 100 }];
  
  if (skillsToShow.length > 0) {
    skillsToShow.forEach(skill => {
      const skillBadge = document.createElement('div');
      skillBadge.className = 'skill-badge bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm';
      skillBadge.innerHTML = `
        ${skill.skill} 
        <span class="text-xs font-normal">(${Math.round(skill.demandScore)}% demand)</span>
      `;
      topSkillsContainer.appendChild(skillBadge);
    });
  } else {
    topSkillsContainer.innerHTML = '<p class="text-gray-500">No skill data available</p>';
  }
}

function updateSummaryCards() {
  // Calculate totals across all provinces
  let totalJobs = 0;
  let activeJobs = 0;
  let jobSeekers = 0;
  let employers = 0;
  let totalHired = 0;
  let totalCreated = 0;
  let totalFulfillmentTime = 0;
  let fulfillmentTimeCount = 0;
  
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
        
        if (skillData.avgFulfillmentTime) {
          totalFulfillmentTime += skillData.avgFulfillmentTime;
          fulfillmentTimeCount++;
        }
      });
    }
  });
  
  const fulfillmentRate = totalCreated > 0 ? Math.round((totalHired / totalCreated) * 100) : 0;
  const avgFulfillmentTime = fulfillmentTimeCount > 0 ? 
    Math.round(totalFulfillmentTime / fulfillmentTimeCount / (24 * 60 * 60)) : 0; // in days
  
  // Update the cards
  document.getElementById('totalJobsCount').textContent = totalJobs.toLocaleString();
  document.getElementById('activeJobsCount').textContent = activeJobs.toLocaleString();
  document.getElementById('availableWorkersCount').textContent = jobSeekers.toLocaleString();
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

// Add these functions to your map.js file

function updateTopProvincesCards() {
    // Sort provinces by total jobs
    const provincesByJobs = Object.entries(provinceData)
        .map(([name, data]) => ({
            name,
            value: data.metrics.totalJobs || 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    
    // Sort provinces by available workers
    const provincesByWorkers = Object.entries(provinceData)
        .map(([name, data]) => ({
            name,
            value: data.metrics.jobSeekers || 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    
    // Update top provinces by jobs
    const topJobsContainer = document.getElementById('topProvincesJobs');
    topJobsContainer.innerHTML = provincesByJobs.map((province, index) => `
        <div class="flex justify-between items-center py-1 border-b border-gray-100">
            <div class="flex items-center gap-2">
                <span class="font-medium text-gray-700">${index + 1}.</span>
                <span>${province.name}</span>
            </div>
            <span class="font-semibold">${province.value.toLocaleString()}</span>
        </div>
    `).join('');
    
    // Update top provinces by workers
    const topWorkersContainer = document.getElementById('topProvincesWorkers');
    topWorkersContainer.innerHTML = provincesByWorkers.map((province, index) => `
        <div class="flex justify-between items-center py-1 border-b border-gray-100">
            <div class="flex items-center gap-2">
                <span class="font-medium text-gray-700">${index + 1}.</span>
                <span>${province.name}</span>
            </div>
            <span class="font-semibold">${province.value.toLocaleString()}</span>
        </div>
    `).join('');
    
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
    
    // Update top skills demand list
    const topSkillsContainer = document.getElementById('topSkillsDemand');
    topSkillsContainer.innerHTML = topSkills.map((skillData, index) => `
        <div class="flex justify-between items-center py-1 border-b border-gray-100">
            <div class="flex items-center gap-2">
                <span class="font-medium text-gray-700">${index + 1}.</span>
                <span>${skillData.skill}</span>
            </div>
            <div class="flex flex-col items-end">
                <span class="text-sm font-semibold">${skillData.activeJobs} jobs</span>
                <span class="text-xs text-gray-500">${skillData.jobSeekers} workers</span>
            </div>
        </div>
    `).join('');
    
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

// Make initMap available globally
window.initMap = initMap;