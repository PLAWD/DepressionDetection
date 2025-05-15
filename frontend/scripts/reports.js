// Reports module for Depression Detection system

document.addEventListener('DOMContentLoaded', function() {
    console.log('Reports module loaded');
    
    // Add report button to UI after analysis
    window.addReportButton = function() {
        if (!window.currentAnalysisData) {
            console.warn('No analysis data available for report generation');
            return;
        }
        
        // Remove any existing report sections and report buttons containers to prevent duplicates
        document.querySelectorAll('.reports-section').forEach(section => section.remove());
        document.querySelectorAll('.report-buttons-container').forEach(container => container.remove());
        
        // Create a sleek container for reports section
        const reportsSection = document.createElement('div');
        reportsSection.className = 'reports-section';
        reportsSection.style.backgroundColor = '#f8f9fa';
        reportsSection.style.borderRadius = '10px';
        reportsSection.style.padding = '20px';
        reportsSection.style.margin = '25px auto';
        reportsSection.style.maxWidth = '90%';
        reportsSection.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
        reportsSection.style.border = '1px solid #eaecef';
        
        // Add title with icon
        const reportTitle = document.createElement('div');
        reportTitle.className = 'reports-title';
        reportTitle.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                 style="margin-right: 8px; vertical-align: middle;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Export Analysis Report</span>
        `;
        reportTitle.style.fontSize = '18px';
        reportTitle.style.fontWeight = '600';
        reportTitle.style.color = '#333';
        reportTitle.style.marginBottom = '15px';
        reportTitle.style.display = 'flex';
        reportTitle.style.alignItems = 'center';
        
        // Create description
        const reportDesc = document.createElement('p');
        reportDesc.className = 'reports-description';
        reportDesc.textContent = 'Download this analysis in your preferred format for future reference or sharing.';
        reportDesc.style.fontSize = '14px';
        reportDesc.style.color = '#666';
        reportDesc.style.marginBottom = '20px';
        
        // Create button container with more spacing
        const reportBtnContainer = document.createElement('div');
        reportBtnContainer.className = 'report-buttons-container';
        reportBtnContainer.style.display = 'flex';
        reportBtnContainer.style.flexWrap = 'wrap';
        reportBtnContainer.style.gap = '12px';
        reportBtnContainer.style.justifyContent = 'center';
        
        // Add the components to the reports section
        reportsSection.appendChild(reportTitle);
        reportsSection.appendChild(reportDesc);
        reportsSection.appendChild(reportBtnContainer);
        
        // Create the report buttons with new styling
        addFormatButton(reportBtnContainer, 'HTML', 'html');
        addFormatButton(reportBtnContainer, 'PDF', 'pdf');
        
        // Find where to add the reports section
        const resultContainer = document.getElementById('resultContainer');
        if (resultContainer) {
            // Find the visualization container
            let vizContainer = document.querySelector('.visualization-container');
            if (!vizContainer) {
                vizContainer = document.createElement('div');
                vizContainer.className = 'visualization-container';
                resultContainer.appendChild(vizContainer);
            }
            
            // Add the reports section after the chart
            const chartContainer = document.getElementById('chart-container');
            if (chartContainer) {
                chartContainer.after(reportsSection);
            } else {
                vizContainer.appendChild(reportsSection);
            }
        }
    };
    
    // Helper function to add a format-specific button with a modern look
    function addFormatButton(container, label, format, isAdvanced = false) {
        // Format-specific colors and icons
        const buttonConfig = {
            'html': {
                color: '#4285f4',
                hoverColor: '#3367d6',
                icon: '<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z"/></svg>'
            },
            'pdf': {
                color: '#ea4335',
                hoverColor: '#d33426',
                icon: '<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/><path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.793.793 0 0 1-.58.029z"/></svg>'
            }
        };

        // Create button element with modern design
        const btn = document.createElement('div');
        btn.className = 'report-button';
        btn.setAttribute('data-format', format);
        
        // Create a sleeker style for the button
        btn.style.backgroundColor = '#fff';
        btn.style.color = buttonConfig[format].color;
        btn.style.border = `1px solid ${buttonConfig[format].color}`;
        btn.style.borderRadius = '8px';
        btn.style.padding = '10px 16px';
        btn.style.cursor = 'pointer';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.gap = '8px';
        btn.style.fontSize = '14px';
        btn.style.fontWeight = '500';
        btn.style.minWidth = '120px';
        btn.style.transition = 'all 0.2s ease';
        btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        
        // Advanced styles for JSON
        if (isAdvanced) {
            btn.style.fontSize = '13px';
            btn.setAttribute('data-advanced', 'true');
            btn.style.opacity = '0.85';
        }
        
        // Set inner content with icon
        btn.innerHTML = `${buttonConfig[format].icon} ${label}`;
        
        // Add hover effects
        btn.onmouseover = function() {
            this.style.backgroundColor = buttonConfig[format].color;
            this.style.color = 'white';
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
        };
        
        btn.onmouseout = function() {
            this.style.backgroundColor = '#fff';
            this.style.color = buttonConfig[format].color;
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        };
        
        // Add click event with visual feedback
        btn.addEventListener('click', function() {
            // Visual feedback when clicked
            const originalContent = this.innerHTML;
            this.innerHTML = `<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"></path>
                              </svg> Generating...`;
            
            const btnElement = this;
            
            // Add spinning animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1.5s linear infinite;
                }
            `;
            document.head.appendChild(style);
            
            // Call the generate function
            generateReport(format).finally(() => {
                // Restore button state after report generation
                setTimeout(() => {
                    btnElement.innerHTML = originalContent;
                }, 500);
            });
        });
        
        container.appendChild(btn);
    }
    
    // Generate and download a report with improved error handling
    function generateReport(format, retryingAfterAssessment = false) {
        if (!window.currentAnalysisData) {
            showReportToast('No analysis data available', 'error');
            return Promise.reject(new Error('No analysis data'));
        }

        const username = document.getElementById('username').value.trim();
        if (!username) {
            showReportToast('Username is required', 'error');
            return Promise.reject(new Error('Username required'));
        }

        showReportToast(`Generating ${format.toUpperCase()} report...`, 'info');

        let analysisData = JSON.parse(JSON.stringify(window.currentAnalysisData));

        if (window.assessmentResult) {
            analysisData.assessment = window.assessmentResult.assessment;
            analysisData.details = window.assessmentResult.details;
            analysisData.assessmentResult = window.assessmentResult;
            Object.assign(analysisData, window.assessmentResult);
        } else if (!retryingAfterAssessment) {
            // Silently run the assessment function if available, without showing modal or prompt
            let assessFn = window.performAssessment || window.assessUserForDepression;
            if (typeof assessFn === 'function') {
                // Temporarily override showAssessment to suppress modal
                const originalShowAssessment = window.showAssessment;
                window.showAssessment = function() {};
                try {
                    assessFn();
                } catch (e) {
                    console.error("Error performing assessment:", e);
                }
                // Restore showAssessment
                window.showAssessment = originalShowAssessment;
                // Try again, but only once
                return generateReport(format, true);
            }
        }

        return fetch('/api/reports/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                analysis_data: analysisData,
                format: format
            }),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || `Failed to generate report (${response.status})`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showReportToast(`${format.toUpperCase()} report generated successfully!`, 'success');
                window.open(data.report_url, '_blank');
                showReportsListButton();
                return data;
            } else {
                throw new Error(data.error || 'Failed to generate report');
            }
        })
        .catch(error => {
            console.error('Error generating report:', error);
            showReportToast(`Error: ${error.message}`, 'error');
            throw error;
        });
    }
    
    // Show a modern toast notification
    function showReportToast(message, type = 'info') {
        // Check if the toast container exists, create it if not
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.position = 'fixed';
            toastContainer.style.bottom = '20px';
            toastContainer.style.right = '20px';
            toastContainer.style.zIndex = '1000';
            document.body.appendChild(toastContainer);
        }
        
        // Colors for different toast types
        const colors = {
            'error': {
                bg: '#fee2e2',
                border: '#ef4444',
                icon: '<svg width="20" height="20" fill="none" stroke="#ef4444" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>'
            },
            'success': {
                bg: '#dcfce7',
                border: '#22c55e',
                icon: '<svg width="20" height="20" fill="none" stroke="#22c55e" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>'
            },
            'info': {
                bg: '#dbeafe', 
                border: '#3b82f6',
                icon: '<svg width="20" height="20" fill="none" stroke="#3b82f6" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
            }
        };
        
        // Create toast element with modern design
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Apply modern styling
        toast.style.backgroundColor = colors[type].bg;
        toast.style.color = '#1f2937';
        toast.style.padding = '12px 16px';
        toast.style.marginBottom = '10px';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        toast.style.width = '300px';
        toast.style.maxWidth = '90vw';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '8px';
        toast.style.border = `1px solid ${colors[type].border}`;
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s ease';
        
        // Add icon based on type
        toast.innerHTML = `${colors[type].icon}<span style="flex: 1">${message}</span>`;
        
        // Add close button
        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.fontSize = '18px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.opacity = '0.7';
        closeBtn.style.marginLeft = '5px';
        closeBtn.onclick = () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        };
        toast.appendChild(closeBtn);
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);
        
        // Remove after timeout
        const timeout = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
        
        // Stop timeout if manually closed
        closeBtn.addEventListener('click', () => clearTimeout(timeout));
    }
    
    // Show a button to view the reports list
    function showReportsListButton() {
        // Check if button already exists
        if (document.getElementById('view-reports-btn')) {
            return;
        }
        
        const btn = document.createElement('button');
        btn.id = 'view-reports-btn';
        btn.className = 'view-reports-btn';
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                 style="margin-right: 8px;">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            View All Reports
        `;
        btn.style.display = 'block';
        btn.style.margin = '15px auto';
        btn.style.padding = '10px 16px';
        btn.style.backgroundColor = '#6366f1';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = '500';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.maxWidth = '200px';
        btn.style.transition = 'all 0.2s ease';
        btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        
        // Add hover effects
        btn.onmouseover = function() {
            this.style.backgroundColor = '#4f46e5';
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
        };
        
        btn.onmouseout = function() {
            this.style.backgroundColor = '#6366f1';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        };
        
        btn.addEventListener('click', function() {
            showReportsListModal();
        });
        
        // Find the reports section
        const reportsSection = document.querySelector('.reports-section');
        if (reportsSection) {
            reportsSection.appendChild(btn);
        } else {
            // Fallback to report buttons container
            const reportBtnsContainer = document.querySelector('.report-buttons-container');
            if (reportBtnsContainer && reportBtnsContainer.parentNode) {
                reportBtnsContainer.parentNode.appendChild(btn);
            } else {
                // Last resort - add to result container
                const resultContainer = document.getElementById('resultContainer');
                if (resultContainer) {
                    resultContainer.appendChild(btn);
                }
            }
        }
    }
    
    // Show a modal with the list of reports
    function showReportsListModal() {
        // Create modal if it doesn't exist
        let reportsModal = document.getElementById('reportsListModal');
        if (!reportsModal) {
            reportsModal = document.createElement('div');
            reportsModal.id = 'reportsListModal';
            reportsModal.className = 'modal';
            reportsModal.style.display = 'none';
            reportsModal.style.position = 'fixed';
            reportsModal.style.zIndex = '1000';
            reportsModal.style.left = '0';
            reportsModal.style.top = '0';
            reportsModal.style.width = '100%';
            reportsModal.style.height = '100%';
            reportsModal.style.overflow = 'auto';
            reportsModal.style.backgroundColor = 'rgba(0,0,0,0.4)';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modalContent.style.backgroundColor = '#fefefe';
            modalContent.style.margin = '5% auto';
            modalContent.style.padding = '25px';
            modalContent.style.border = 'none';
            modalContent.style.width = '85%';
            modalContent.style.maxWidth = '800px';
            modalContent.style.borderRadius = '12px';
            modalContent.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
            modalContent.style.position = 'relative';
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-button';
            closeBtn.innerHTML = '&times;';
            closeBtn.style.position = 'absolute';
            closeBtn.style.top = '15px';
            closeBtn.style.right = '20px';
            closeBtn.style.color = '#666';
            closeBtn.style.fontSize = '28px';
            closeBtn.style.fontWeight = 'bold';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.padding = '0';
            closeBtn.style.lineHeight = '1';
            closeBtn.onclick = function() {
                reportsModal.style.opacity = '0';
                setTimeout(() => { reportsModal.style.display = 'none'; }, 300);
            };
            
            const title = document.createElement('h2');
            title.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                     style="margin-right: 10px; vertical-align: middle;">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                Your Reports
            `;
            title.style.marginTop = '0';
            title.style.marginBottom = '20px';
            title.style.color = '#333';
            title.style.display = 'flex';
            title.style.alignItems = 'center';
            
            const reportsList = document.createElement('div');
            reportsList.id = 'reports-list-container';
            reportsList.style.marginTop = '20px';
            
            // Loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'reports-loading';
            loadingDiv.style.textAlign = 'center';
            loadingDiv.style.padding = '30px';
            loadingDiv.innerHTML = `
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" class="spin">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                </svg>
                <p style="color: #666;">Loading reports...</p>
            `;
            
            modalContent.appendChild(closeBtn);
            modalContent.appendChild(title);
            modalContent.appendChild(loadingDiv);
            modalContent.appendChild(reportsList);
            reportsModal.appendChild(modalContent);
            document.body.appendChild(reportsModal);
            
            // Add spinning animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1.5s linear infinite;
                }
            `;
            document.head.appendChild(style);
            
            // Add animation for modal
            reportsModal.style.opacity = '0';
            reportsModal.style.transition = 'opacity 0.3s ease';
            
            // Close when clicking outside the modal
            window.addEventListener('click', function(event) {
                if (event.target === reportsModal) {
                    reportsModal.style.opacity = '0';
                    setTimeout(() => { reportsModal.style.display = 'none'; }, 300);
                }
            });
        }
        
        // Show the modal with animation
        reportsModal.style.display = 'block';
        setTimeout(() => { reportsModal.style.opacity = '1'; }, 10);
        
        // Show loading indicator
        const loadingDiv = document.getElementById('reports-loading');
        if (loadingDiv) loadingDiv.style.display = 'block';
        
        // Hide the reports list while loading
        const reportsListContainer = document.getElementById('reports-list-container');
        if (reportsListContainer) reportsListContainer.style.display = 'none';
        
        // Fetch reports list from API
        const username = document.getElementById('username').value.trim();
        
        fetch(`/api/reports/list${username ? `?username=${encodeURIComponent(username)}` : ''}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || `Failed to fetch reports (${response.status})`);
                    });
                }
                return response.json();
            })
            .then(data => {
                // Hide loading indicator
                if (loadingDiv) loadingDiv.style.display = 'none';
                
                // Show reports list
                if (reportsListContainer) reportsListContainer.style.display = 'block';
                
                if (data.success) {
                    displayReportsList(data.reports);
                } else {
                    showReportToast(data.error || 'Failed to fetch reports', 'error');
                }
            })
            .catch(error => {
                // Hide loading indicator
                if (loadingDiv) loadingDiv.style.display = 'none';
                
                // Show error message in the modal
                if (reportsListContainer) {
                    reportsListContainer.style.display = 'block';
                    reportsListContainer.innerHTML = `
                        <div style="text-align: center; padding: 30px; color: #ef4444;">
                            <svg width="50" height="50" fill="none" stroke="#ef4444" viewBox="0 0 24 24" stroke-width="1.5">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 8v4M12 16h.01"/>
                            </svg>
                            <p>${error.message}</p>
                        </div>
                    `;
                }
                
                console.error('Error fetching reports:', error);
                showReportToast(`Error: ${error.message}`, 'error');
            });
    }
    
    // Display the reports list in the modal with improved styling
    function displayReportsList(reports) {
        const container = document.getElementById('reports-list-container');
        if (!container) return;
        
        if (reports.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #666;">
                    <svg width="50" height="50" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" stroke-width="1.5">
                        <path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
                        <path d="M12 11v2M12 17h.01"/>
                    </svg>
                    <p>No reports found.</p>
                </div>
            `;
            return;
        }
        
        // Create cards layout for reports
        const reportsGrid = document.createElement('div');
        reportsGrid.style.display = 'grid';
        reportsGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
        reportsGrid.style.gap = '20px';
        
        reports.forEach(report => {
            // Format date string from timestamp
            let dateStr = 'Unknown';
            try {
                const date = new Date(report.created);
                dateStr = date.toLocaleString();
            } catch (e) {
                console.error('Error parsing date:', e);
            }
            
            // Format-specific icons and colors
            const formatConfig = {
                'html': {
                    icon: '<svg width="20" height="20" fill="none" stroke="#4285f4" viewBox="0 0 24 24" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15l3 3 3-3"/><path d="M12 10v8"/></svg>',
                    color: '#4285f4'
                },
                'pdf': {
                    icon: '<svg width="20" height="20" fill="none" stroke="#ea4335" viewBox="0 0 24 24" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>',
                    color: '#ea4335'
                }
            };
            
            // Default if format not recognized
            const format = report.format.toLowerCase();
            const icon = formatConfig[format]?.icon || formatConfig.html.icon;
            const color = formatConfig[format]?.color || formatConfig.html.color;
            
            // Create report card
            const card = document.createElement('div');
            card.className = 'report-card';
            card.style.backgroundColor = '#fff';
            card.style.borderRadius = '10px';
            card.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)';
            card.style.border = '1px solid #eee';
            card.style.overflow = 'hidden';
            card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
            
            // Hover effect
            card.onmouseover = function() {
                this.style.transform = 'translateY(-5px)';
                this.style.boxShadow = '0 7px 14px rgba(0,0,0,0.12)';
            };
            
            card.onmouseout = function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)';
            };
            
            // Card header
            const cardHeader = document.createElement('div');
            cardHeader.style.borderBottom = '1px solid #eee';
            cardHeader.style.padding = '15px';
            cardHeader.style.display = 'flex';
            cardHeader.style.alignItems = 'center';
            cardHeader.style.gap = '10px';
            
            // Format icon
            const formatIcon = document.createElement('div');
            formatIcon.innerHTML = icon;
            formatIcon.style.display = 'flex';
            formatIcon.style.alignItems = 'center';
            formatIcon.style.justifyContent = 'center';
            formatIcon.style.width = '36px';
            formatIcon.style.height = '36px';
            formatIcon.style.borderRadius = '8px';
            formatIcon.style.backgroundColor = `${color}15`; // Light background of the color
            
            // Report info
            const reportInfo = document.createElement('div');
            reportInfo.style.flex = '1';
            
            const formatText = document.createElement('div');
            formatText.textContent = `${report.format.toUpperCase()} Report`;
            formatText.style.fontWeight = '600';
            formatText.style.color = '#333';
            
            const usernameText = document.createElement('div');
            usernameText.textContent = `@${report.username}`;
            usernameText.style.fontSize = '14px';
            usernameText.style.color = '#666';
            
            reportInfo.appendChild(formatText);
            reportInfo.appendChild(usernameText);
            
            cardHeader.appendChild(formatIcon);
            cardHeader.appendChild(reportInfo);
            
            // Card body
            const cardBody = document.createElement('div');
            cardBody.style.padding = '15px';
            
            const dateText = document.createElement('div');
            dateText.style.fontSize = '13px';
            dateText.style.color = '#666';
            dateText.style.marginBottom = '15px';
            dateText.innerHTML = `
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" style="margin-right: 5px; vertical-align: middle;">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                </svg>
                ${dateStr}
            `;
            
            // Actions
            const actionButtons = document.createElement('div');
            actionButtons.style.display = 'flex';
            actionButtons.style.gap = '8px';
            
            // View button
            const viewBtn = document.createElement('button');
            viewBtn.className = 'view-report-btn';
            viewBtn.setAttribute('data-url', report.url);
            viewBtn.textContent = 'View';
            viewBtn.style.flex = '1';
            viewBtn.style.padding = '8px 0';
            viewBtn.style.backgroundColor = color;
            viewBtn.style.color = 'white';
            viewBtn.style.border = 'none';
            viewBtn.style.borderRadius = '6px';
            viewBtn.style.cursor = 'pointer';
            viewBtn.style.fontWeight = '500';
            viewBtn.style.fontSize = '14px';
            viewBtn.style.transition = 'all 0.2s ease';
            
            viewBtn.onmouseover = function() {
                this.style.opacity = '0.9';
            };
            
            viewBtn.onmouseout = function() {
                this.style.opacity = '1';
            };
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-report-btn';
            deleteBtn.setAttribute('data-id', report.report_id);
            deleteBtn.textContent = 'Delete';
            deleteBtn.style.padding = '8px 0';
            deleteBtn.style.backgroundColor = 'transparent';
            deleteBtn.style.color = '#666';
            deleteBtn.style.border = '1px solid #ddd';
            deleteBtn.style.borderRadius = '6px';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.fontWeight = '500';
            deleteBtn.style.fontSize = '14px';
            deleteBtn.style.width = '80px';
            deleteBtn.style.transition = 'all 0.2s ease';
            
            deleteBtn.onmouseover = function() {
                this.style.backgroundColor = '#fee2e2';
                this.style.borderColor = '#ef4444';
                this.style.color = '#ef4444';
            };
            
            deleteBtn.onmouseout = function() {
                this.style.backgroundColor = 'transparent';
                this.style.borderColor = '#ddd';
                this.style.color = '#666';
            };
            
            actionButtons.appendChild(viewBtn);
            actionButtons.appendChild(deleteBtn);
            
            cardBody.appendChild(dateText);
            cardBody.appendChild(actionButtons);
            
            // Assemble the card
            card.appendChild(cardHeader);
            card.appendChild(cardBody);
            
            // Add to grid
            reportsGrid.appendChild(card);
        });
        
        // Replace container content with the grid
        container.innerHTML = '';
        container.appendChild(reportsGrid);
        
        // Add event listeners for buttons
        container.querySelectorAll('.view-report-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const url = this.getAttribute('data-url');
                if (url) {
                    window.open(url, '_blank');
                }
            });
        });
        
        container.querySelectorAll('.delete-report-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const reportId = this.getAttribute('data-id');
                if (reportId) {
                    // Use custom confirm dialog instead of browser default
                    if (confirm('Are you sure you want to delete this report?')) {
                        deleteReport(reportId, this.closest('.report-card'));
                    }
                }
            });
        });
    }
    
    // Delete a report with improved feedback
    function deleteReport(reportId, reportCard) {
        // Show loading state on the card
        if (reportCard) {
            reportCard.style.opacity = '0.7';
            reportCard.style.pointerEvents = 'none';
        }
        
        fetch(`/api/reports/${reportId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || `Failed to delete report (${response.status})`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Remove card with animation
                if (reportCard) {
                    reportCard.style.transform = 'scale(0.9)';
                    reportCard.style.opacity = '0';
                    setTimeout(() => {
                        reportCard.remove();
                        
                        // Check if grid is now empty
                        const grid = document.querySelector('#reports-list-container > div');
                        if (grid && grid.children.length === 0) {
                            document.getElementById('reports-list-container').innerHTML = `
                                <div style="text-align: center; padding: 30px; color: #666;">
                                    <svg width="50" height="50" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" stroke-width="1.5">
                                        <path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
                                        <path d="M12 11v2M12 17h.01"/>
                                    </svg>
                                    <p>No reports found.</p>
                                </div>
                            `;
                        }
                    }, 300);
                }
                
                showReportToast('Report deleted successfully', 'success');
            } else {
                // Restore card state
                if (reportCard) {
                    reportCard.style.opacity = '1';
                    reportCard.style.pointerEvents = 'auto';
                }
                
                showReportToast(data.error || 'Failed to delete report', 'error');
            }
        })
        .catch(error => {
            console.error('Error deleting report:', error);
            
            // Restore card state
            if (reportCard) {
                reportCard.style.opacity = '1';
                reportCard.style.pointerEvents = 'auto';
            }
            
            showReportToast(`Error: ${error.message}`, 'error');
        });
    }
    
    // Emotional Dimensions Section
    pdf.set_font("Arial", "B", 14)
    pdf.set_text_color(44, 62, 80)
    pdf.cell(0, 10, "Emotional Dimensions", 0, 1)
    emotion_dims = this.analysis_data.get('emotion_dimensions', {})
    if (emotion_dims) {
        pdf.set_font("Arial", "", 10)
        pdf.set_text_color(70, 70, 70)
        for (const [dim, value] of Object.entries(emotion_dims)) {
            // Skip 'anxiety' dimension
            if (dim === 'anxiety') continue;
            // ...existing code for rendering each dimension...
        }
    } else {
        // ...existing code...
    }

    // Export the global functions
    window.addReportButton = window.addReportButton || addReportButton;
    window.showReportsListModal = showReportsListModal;
    
    // Listen for assessment results
    window.saveAssessmentResult = function(result) {
        window.assessmentResult = result;
        console.log("Assessment result saved for reports:", result);
    };
    
    // Add reports button to any existing analysis
    if (window.currentAnalysisData) {
        setTimeout(addReportButton, 500);
    }
});
