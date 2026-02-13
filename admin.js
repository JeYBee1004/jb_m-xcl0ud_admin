    // ✅ Validate credentials
    const SUPABASE_URL = 'https://ocjppztixpvqcmqozmto.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9janBwenRpeHB2cWNtcW96bXRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjI3ODEsImV4cCI6MjA3NDA5ODc4MX0.I8UEF_Sq-50wfikKmOc7StoqdHj0vclQbzCsfkCSb4c';


if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === '' || SUPABASE_ANON_KEY === '') {
    console.error('❌ Supabase credentials not configured properly');
    alert('⚠️ Supabase configuration error. Please check your environment variables.');
    throw new Error("Supabase config missing");
} else {
    console.log('✅ Supabase credentials loaded');
    console.log('📍 Supabase URL:', SUPABASE_URL);
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


/* ===============================
   AUTH + BOOTSTRAP
================================ */

document.addEventListener("DOMContentLoaded", () => {
    const password = prompt("Enter Admin Password:");
    if (password !== "J3ybee$M!x") {
        alert("Access Denied.");
        window.location.href = "adminSupabase.html";
        return;
    }

    new AdminPanel();
});


/* ===============================
   MIX MANAGER
================================ */

class MixManager {

    // ✅ FIXED connection test
    async testConnection() {
        try {
            console.log('🔍 Testing Supabase connection...');
            const { data, error } = await supabase
                .from('mixes')
                .select('id')
                .limit(1);

            if (error) throw error;
            console.log('✅ Supabase connection successful');
            return true;
        } catch (error) {
            console.error('❌ Connection test failed:', error.message);
            return false;
        }
    }

    async getAllMixes() {
        try {
            console.log("Fetching mixes from Supabase...");
            const { data, error } = await supabase
                .from('mixes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("❌ Error fetching mixes:", error.message);
            return [];
        }
    }

    async addMix(formData) {
        const title = formData.get("title");
        const artist = formData.get("artist");
        const genre = formData.get("genre");
        const duration = formData.get("duration");
        const file = formData.get("audioFile");

        if (!file) throw new Error("No file selected");
        if (!title || !artist || !genre) throw new Error("Missing required fields");

        const isConnected = await this.testConnection();
        if (!isConnected) throw new Error("Cannot connect to Supabase");

        console.log("📤 Uploading file to Supabase Storage...");

        const fileExt = file.name.split('.').pop();
        const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${Date.now()}-${safeTitle}.${fileExt}`;
        const filePath = `${genre}/${fileName}`;

        // ✅ FIXED MIME handling
        const contentType = (file.type && file.type.includes("audio")) 
            ? file.type 
            : "audio/mpeg";

        const { error: uploadError } = await supabase.storage
            .from('mixcl0ud')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType
            });

        if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        console.log("✅ File uploaded");

        // ✅ SIGNED URL (secure + reliable)
        const { data: signedData, error: signedError } =
            await supabase.storage
                .from('mixcl0ud')
                .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

        if (signedError || !signedData?.signedUrl) {
            await supabase.storage.from('mixcl0ud').remove([filePath]);
            throw new Error("Failed to generate audio URL");
        }

        const audioUrl = signedData.signedUrl;

        // 💾 Insert DB
        const { data: inserted, error: insertError } = await supabase
            .from('mixes')
            .insert([{
                title,
                artist,
                genre,
                duration: duration || '0:00',
                audio_file_path: filePath,
                audio_url: audioUrl
            }])
            .select();

        if (insertError) {
            await supabase.storage.from('mixcl0ud').remove([filePath]);
            throw new Error(`Database insert failed: ${insertError.message}`);
        }

        console.log("✅ Mix added:", inserted[0]);
        return inserted[0];
    }

    async deleteMix(mixId, filePath) {
        try {
            console.log(`🗑️ Deleting mix: ${mixId}`);

            const { error: dbError } = await supabase
                .from('mixes')
                .delete()
                .eq('id', mixId);

            if (dbError) throw dbError;

            if (filePath) {
                const { error: storageError } = await supabase.storage
                    .from('mixcl0ud')
                    .remove([filePath]);

                if (storageError) throw storageError;
            }

            console.log("✅ Mix deleted");
            return true;
        } catch (error) {
            console.error("❌ Delete failed:", error.message);
            return false;
        }
    }
}


/* ===============================
   ADMIN PANEL
================================ */

class AdminPanel {
    constructor() {
        this.mixManager = new MixManager();
        this.isUploading = false;
        this.initializePanel();
        this.setupEventListeners();
    }

    async initializePanel() {
        const connected = await this.mixManager.testConnection();
        if (!connected) {
            this.showStatus("⚠️ Cannot connect to Supabase", "error");
        } else {
            await this.renderExistingMixes();
        }
    }

    setupEventListeners() {
        const form = document.getElementById("upload-form");
        const fileInput = document.getElementById("audio-file");

        form.addEventListener("submit", (e) => this.handleSubmit(e));
        fileInput.addEventListener("change", (e) => this.handleFileChange(e));
    }

    handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        const info = document.getElementById("file-info");
        info.textContent = `Selected: ${file.name} (${this.formatFileSize(file.size)})`;
        info.style.display = "block";

        const audio = new Audio();
        const objUrl = URL.createObjectURL(file);
        audio.src = objUrl;

        audio.addEventListener("loadedmetadata", () => {
            const total = Math.floor(audio.duration || 0);
            const minutes = Math.floor(total / 60);
            const seconds = total % 60;
            document.getElementById("duration").value =
                `${minutes}:${seconds.toString().padStart(2, "0")}`;
            URL.revokeObjectURL(objUrl);
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (this.isUploading) return;

        const form = e.target;
        const formData = new FormData(form);
        const file = formData.get("audioFile");

        if (!file) return this.showStatus("❌ Please select an audio file", "error");

        try {
            this.isUploading = true;
            const btn = document.getElementById("submit-btn");
            btn.disabled = true;
            btn.innerHTML = 'Uploading...';

            this.showStatus("📤 Uploading...", "info");

            await this.mixManager.addMix(formData);

            this.showStatus("✅ Mix uploaded successfully!", "success");
            form.reset();
            document.getElementById("file-info").style.display = "none";

            await this.renderExistingMixes();
        } catch (err) {
            console.error("❌ Upload failed:", err.message);
            this.showStatus(`❌ ${err.message}`, "error");
        } finally {
            this.isUploading = false;
            const btn = document.getElementById("submit-btn");
            btn.disabled = false;
            btn.innerHTML = 'Upload Mix';
        }
    }

    async renderExistingMixes() {
        const container = document.getElementById("existing-mixes");
        container.innerHTML = "<p>Loading...</p>";

        try {
            const mixes = await this.mixManager.getAllMixes();

            if (!mixes.length) {
                container.innerHTML = '<p style="color:#aaa;text-align:center;">No mixes yet.</p>';
                return;
            }

            container.innerHTML = mixes.map(mix => {
                const safeTitle = mix.title || "Untitled";
                const safeArtist = mix.artist || "Unknown";
                const safeGenre = mix.genre || "N/A";
                const safeDuration = mix.duration || "0:00";
                const audioUrl = mix.audio_url || "";

                return `
                    <div class="existing-mix" data-id="${mix.id}" data-file-path="${mix.audio_file_path || ''}">
                        <div class="existing-mix-info">
                            <h4>${safeTitle}</h4>
                            <p>${safeArtist} • ${safeGenre} • ${safeDuration}</p>
                        </div>
                        <audio controls src="${audioUrl}" style="max-width: 300px;"></audio>
                        <button class="delete-btn">🗑️</button>
                    </div>
                `;
            }).join("");

            container.querySelectorAll(".delete-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const mixDiv = btn.closest(".existing-mix");
                    const id = mixDiv.dataset.id;
                    const path = mixDiv.dataset.filePath;

                    if (confirm("Are you sure?")) {
                        await this.mixManager.deleteMix(id, path);
                        await this.renderExistingMixes();
                    }
                });
            });

        } catch (err) {
            console.error("❌ Error rendering mixes:", err.message);
            container.innerHTML = `<p style="color:#f66;">Error: ${err.message}</p>`;
        }
    }

    showStatus(msg, type) {
        const div = document.getElementById("upload-status");
        div.textContent = msg;
        div.className = `upload-status ${type}`;
        div.style.display = "block";
    }

    formatFileSize(bytes) {
        const sizes = ["Bytes", "KB", "MB", "GB"];
        if (bytes === 0) return "0 Bytes";
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }
}

