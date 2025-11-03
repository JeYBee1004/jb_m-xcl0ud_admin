const password = prompt("Enter Admin Password:");
  if (password !== "J3ybee$M!x") {
    alert("Access Denied.");
    window.location.href = "admin.html"; // redirect to homepage
  }

class MixManager {
  async getAllMixes() {
    const res = await fetch(`${API}/mixes`);
    return res.json();
  }

  async addMix(formData) {
    const res = await fetch(`${API}/mixes`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  }

  async deleteMix(id) {
    await fetch(`${API}/mixes/${id}`, { method: "DELETE" });
  }
}

class AdminPanel {
  constructor() {
    this.mixManager = new MixManager();
    this.setupEventListeners();
    this.renderExistingMixes();
  }

  setupEventListeners() {
    const form = document.getElementById("upload-form");
    const fileInput = document.getElementById("audio-file");

    form.addEventListener("submit", (e) => this.handleSubmit(e));
    fileInput.addEventListener("change", (e) => this.handleFileChange(e));
  }

  handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      const fileSize = this.formatFileSize(file.size);
      document.getElementById("file-info").textContent = `Selected file: ${file.name} (${fileSize})`;
      document.getElementById("file-info").style.display = "block";

      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      audio.src = objectUrl;
      audio.addEventListener("loadedmetadata", () => {
        const total = Math.floor(audio.duration);
        const minutes = Math.floor(total / 60);
        const seconds = total % 60;
        document.getElementById("duration").value = `${minutes}:${seconds.toString().padStart(2, "0")}`;
        URL.revokeObjectURL(objectUrl);
      });
    }
  }

  async handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const title = formData.get("title");
    const artist = formData.get("artist");
    const genre = formData.get("genre");
    const duration = formData.get("duration");
    const file = formData.get("audioFile");

    if (!title || !artist || !genre || !file) {
      alert("Please fill all fields and select an audio file.");
      return;
    }

    const submitBtn = document.getElementById("submit-btn");
    const statusDiv = document.getElementById("upload-status");

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
      this.showStatus("Uploading file...", "info");

      await this.mixManager.addMix(formData);

      this.showStatus("Mix uploaded successfully!", "success");
      form.reset();
      document.getElementById("file-info").style.display = "none";

      await this.renderExistingMixes();

      setTimeout(() => {
        statusDiv.style.display = "none";
      }, 3000);
    } catch (err) {
      console.error(err);
      this.showStatus("Upload failed. Please try again.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Mix';
    }
  }

  async renderExistingMixes() {
    const container = document.getElementById("existing-mixes");
    const mixes = await this.mixManager.getAllMixes();

    if (mixes.length === 0) {
      container.innerHTML = '<p style="color: #aaa; text-align: center;">No mixes uploaded yet.</p>';
      return;
    }

    container.innerHTML = mixes
      .map(
        (mix) => `
          <div class="existing-mix" data-id="${mix._id}">
            <h4>${mix.title}</h4>
            <p>${mix.artist} • ${mix.genre} • ${mix.duration}</p>
            <audio controls src="${API.replace('/api', '')}${mix.audioUrl}"></audio>
            <button class="delete-btn"><i class="fas fa-trash"></i></button>
          </div>`
      )
      .join("");

    container.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = btn.closest(".existing-mix").dataset.id;
        await this.mixManager.deleteMix(id);
        await this.renderExistingMixes();
      });
    });
  }

  formatFileSize(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
  }

  showStatus(message, type) {
    const statusDiv = document.getElementById("upload-status");
    statusDiv.textContent = message;
    statusDiv.className = `upload-status ${type}`;
    statusDiv.style.display = "block";
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => new AdminPanel());
