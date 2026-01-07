document.addEventListener("DOMContentLoaded", () => {
    const participantsList = document.getElementById("participants");
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: create initials from email/name
  function getInitials(text) {
    if (!text) return "";
    const name = text.split("@")[0] || text;
    const parts = name.split(/[\.\-_ ]+/).filter(Boolean);
    const initials = parts.map((p) => p[0].toUpperCase()).slice(0, 2).join("");
    return initials || name.slice(0, 2).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and activity select options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Build global participants list
      const allParticipants = [];
      Object.entries(activities).forEach(([activityName, details]) => {
        if (details.participants && details.participants.length > 0) {
          details.participants.forEach(email => {
            allParticipants.push({ email, activity: activityName });
          });
        }
      });
      participantsList.innerHTML = "";
      if (allParticipants.length === 0) {
        participantsList.innerHTML = '<li style="color:#666;font-size:14px;">No participants yet</li>';
      } else {
        allParticipants.forEach(({ email, activity }) => {
          const li = document.createElement('li');
          li.style.display = 'flex';
          li.style.alignItems = 'center';
          // Avatar
          const initials = getInitials(email);
          const avatar = document.createElement('span');
          avatar.className = 'participant-avatar';
          avatar.textContent = initials;
          // Name
          const nameSpan = document.createElement('span');
          nameSpan.className = 'participant-name';
          nameSpan.textContent = email + ' (' + activity + ')';
          // Delete icon
          const deleteBtn = document.createElement('button');
          deleteBtn.innerHTML = '🗑️';
          deleteBtn.title = 'Unregister participant';
          deleteBtn.style.marginLeft = '8px';
          deleteBtn.style.background = 'none';
          deleteBtn.style.border = 'none';
          deleteBtn.style.cursor = 'pointer';
          deleteBtn.onclick = function() {
            unregisterParticipant(activity, email);
          };
          li.appendChild(avatar);
          li.appendChild(nameSpan);
          li.appendChild(deleteBtn);
          participantsList.appendChild(li);
        });
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = Math.max(0, details.max_participants - details.participants.length);

        // Build participants HTML
        let participantsHtml = "";
        if (details.participants && details.participants.length > 0) {
          const items = details.participants
            .map((p) => {
              const initials = getInitials(p);
              return `<div class="participant-item"><span class="participant-avatar">${initials}</span><span class="participant-name">${p}</span><span class="delete-participant" title="Remove" data-activity="${name}" data-email="${p}">🗑️</span></div>`;
            })
            .join("");
          participantsHtml = `<div class="participants-list">${items}</div>`;
        } else {
          participantsHtml = `<p class="participants-empty" style="color:#666;font-size:14px;">No participants yet</p>`;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <strong>Participants:</strong>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name + (spotsLeft === 0 ? " (Full)" : "");
        option.disabled = spotsLeft === 0;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities to show the new participant and updated availability
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  // Delegate click event for delete icons in activity cards
  activitiesList.addEventListener("click", async (event) => {
    const target = event.target;
    if (target.classList.contains("delete-participant")) {
      const activity = target.getAttribute("data-activity");
      const email = target.getAttribute("data-email");
      if (activity && email) {
        await unregisterParticipant(activity, email);
      }
    }
  });

  // Unregister participant helper for both global and card lists
  async function unregisterParticipant(activity, email) {
    try {
      const response = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`, {
        method: "POST"
      });
      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }
      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to remove participant. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
    }
  }
});
