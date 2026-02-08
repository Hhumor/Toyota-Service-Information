(function() {
    'use strict';

    let modal = null;
    let modalContent = null;
    let modalClose = null;
    let currentImg = null;
    let scale = 1;
    let minScale = 0.5;
    let maxScale = 5;
    let isDragging = false;
    let startX, startY;
    let translateX = 0;
    let translateY = 0;
    let initialDistance = 0;
    let initialScale = 1;

    function createModal() {
        if (modal) return;

        modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.id = 'imageModal';

        modalClose = document.createElement('div');
        modalClose.className = 'image-modal-close';
        modalClose.innerHTML = '&times;';
        modal.appendChild(modalClose);

        modalContent = document.createElement('div');
        modalContent.className = 'image-modal-content';
        modal.appendChild(modalContent);

        const zoomControls = document.createElement('div');
        zoomControls.className = 'zoom-controls';
        
        const zoomIn = document.createElement('button');
        zoomIn.className = 'zoom-btn zoom-in';
        zoomIn.innerHTML = '+';
        zoomIn.addEventListener('click', function(e) {
            e.stopPropagation();
            zoomInImage();
        });
        
        const zoomOut = document.createElement('button');
        zoomOut.className = 'zoom-btn zoom-out';
        zoomOut.innerHTML = '-';
        zoomOut.addEventListener('click', function(e) {
            e.stopPropagation();
            zoomOutImage();
        });
        
        const zoomReset = document.createElement('button');
        zoomReset.className = 'zoom-btn zoom-reset';
        zoomReset.innerHTML = '重置';
        zoomReset.addEventListener('click', function(e) {
            e.stopPropagation();
            resetZoom();
        });

        zoomControls.appendChild(zoomIn);
        zoomControls.appendChild(zoomReset);
        zoomControls.appendChild(zoomOut);
        modal.appendChild(zoomControls);

        document.body.appendChild(modal);

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        modalClose.addEventListener('click', function(e) {
            e.stopPropagation();
            closeModal();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    function openModal(imgSrc) {
        if (!modal) {
            createModal();
        }

        scale = 1;
        translateX = 0;
        translateY = 0;

        modalContent.innerHTML = '';
        currentImg = document.createElement('img');
        currentImg.src = imgSrc;
        currentImg.alt = 'Preview';
        currentImg.style.transform = 'scale(1) translate(0px, 0px)';
        currentImg.style.transition = 'transform 0.1s ease-out';
        modalContent.appendChild(currentImg);

        setupImageEvents();

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function setupImageEvents() {
        if (!currentImg) return;

        currentImg.addEventListener('wheel', function(e) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newScale = Math.min(maxScale, Math.max(minScale, scale + delta));
            scale = newScale;
            updateTransform();
        });

        currentImg.addEventListener('mousedown', function(e) {
            if (scale > 1) {
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                currentImg.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('mousemove', function(e) {
            if (isDragging && currentImg) {
                e.preventDefault();
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                updateTransform();
            }
        });

        document.addEventListener('mouseup', function() {
            isDragging = false;
            if (currentImg) {
                currentImg.style.cursor = scale > 1 ? 'grab' : 'default';
            }
        });

        currentImg.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
                initialDistance = getTouchDistance(e.touches);
                initialScale = scale;
                e.preventDefault();
            } else if (e.touches.length === 1 && scale > 1) {
                isDragging = true;
                startX = e.touches[0].clientX - translateX;
                startY = e.touches[0].clientY - translateY;
            }
        });

        currentImg.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2) {
                const currentDistance = getTouchDistance(e.touches);
                const scaleChange = currentDistance / initialDistance;
                const newScale = Math.min(maxScale, Math.max(minScale, initialScale * scaleChange));
                scale = newScale;
                updateTransform();
                e.preventDefault();
            } else if (e.touches.length === 1 && isDragging) {
                e.preventDefault();
                translateX = e.touches[0].clientX - startX;
                translateY = e.touches[0].clientY - startY;
                updateTransform();
            }
        });

        currentImg.addEventListener('touchend', function(e) {
            if (e.touches.length === 0) {
                isDragging = false;
            }
        });
    }

    function getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function updateTransform() {
        if (currentImg) {
            currentImg.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
        }
    }

    function zoomInImage() {
        scale = Math.min(maxScale, scale + 0.5);
        updateTransform();
    }

    function zoomOutImage() {
        scale = Math.max(minScale, scale - 0.5);
        updateTransform();
    }

    function resetZoom() {
        scale = 1;
        translateX = 0;
        translateY = 0;
        updateTransform();
    }

    function closeModal() {
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            setTimeout(function() {
                if (modalContent) {
                    modalContent.innerHTML = '';
                }
                currentImg = null;
                scale = 1;
                translateX = 0;
                translateY = 0;
            }, 300);
        }
    }

    function initImagePreview() {
        const images = document.querySelectorAll('img');
        images.forEach(function(img) {
            img.style.cursor = 'pointer';
            img.addEventListener('click', function(e) {
                e.preventDefault();
                const src = this.getAttribute('src');
                if (src) {
                    openModal(src);
                }
            });
        });
    }

    function enableInteraction() {
        if (!document.body) return;
        document.body.oncontextmenu = null;
        document.body.onselectstart = null;
        document.oncontextmenu = null;
        document.onselectstart = null;
        document.body.removeAttribute('oncontextmenu');
        document.body.removeAttribute('onselectstart');
    }

    function init() {
        initImagePreview();
        enableInteraction();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();