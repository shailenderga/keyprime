const ImageModal = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;
    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-8 animate-fade-in cursor-zoom-out" 
            onClick={onClose}
        >
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 sm:top-8 sm:right-8 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 sm:p-3 rounded-full transition-all shadow-lg"
            >
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <img 
                src={imageUrl} 
                alt="Fullscreen Attachment" 
                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl cursor-default border border-white/10" 
                onClick={e => e.stopPropagation()} 
            />
        </div>
    );
};

export default ImageModal;
