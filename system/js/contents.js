(function() {
    'use strict';

    let modal = null;
    let modalContent = null;
    let modalClose = null;

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

        modalContent.innerHTML = '';
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = 'Preview';
        modalContent.appendChild(img);

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            setTimeout(function() {
                if (modalContent) {
                    modalContent.innerHTML = '';
                }
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initImagePreview);
    } else {
        initImagePreview();
    }

})();