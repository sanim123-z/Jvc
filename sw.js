self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // اعتراض الصور القادمة من المشاركة الخارجية
    if (url.searchParams.has('share-target') && event.request.method === 'POST') {
        event.respondWith((async () => {
            try {
                const formData = await event.request.formData();
                const images = formData.getAll('shared_images');

                const db = await new Promise((resolve, reject) => {
                    const request = indexedDB.open('AI_Doc_Studio_Shared', 1);
                    request.onupgradeneeded = (e) => {
                        const dbInstance = e.target.result;
                        if (!dbInstance.objectStoreNames.contains('shared_files')) {
                            dbInstance.createObjectStore('shared_files', { autoIncrement: true });
                        }
                    };
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });

                const tx = db.transaction('shared_files', 'readwrite');
                const store = tx.objectStore('shared_files');
                
                for (const file of images) {
                    if (file && file.type.startsWith('image/')) {
                        store.add(file);
                    }
                }

                await new Promise(resolve => { tx.oncomplete = resolve; });

            } catch (error) {
                console.error('Error receiving shared files:', error);
            }
            
            // التعديل هنا: إعادة التوجيه إلى مسار التطبيق الحالي بدلاً من المسار الرئيسي
            const redirectUrl = url.origin + url.pathname;
            return Response.redirect(redirectUrl, 303);
        })());
    }
});