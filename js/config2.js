const BUSINESS = {
    name: "PMELAB TECHNOLOGY LIMITED",
    shortName: "PMELAB STORE",
    phone: "+2347040616209",
    email: "support@paymelab.com",
    address: "Office No. 9, Achida Plaza, Opposite JEFLA, Beside AA RANO Filling Station, Kpakungu, Minna, Niger State, Nigeria.",
    country: "Nigeria",
    currency: "₦",
    currencyCode: "NGN",
    website: "https://paymelab.com"
};

const API_BASE_URL = "";

const BRAND = {
    primaryColor: "#16A34A",
    primaryDark: "#15803D",
    primaryLight: "#DCFCE7",
    backgroundColor: "#FFFFFF",
    lightBackground: "#F8FAFC",
    textColor: "#111827",
    mutedTextColor: "#6B7280",
    borderColor: "#E5E7EB",
    buttonTextColor: "#FFFFFF",
    preset: "green"
};

const PAYMENT = {
    paystackEnabled: true,
    manualEnabled: true,
    manualReceiptRequired: true,
    paystackPublicKey: "pk_test_d81cbc3f5d3f34ad13bb5b6626b869bb4545b02a",
    flutterwaveEnabled: false,
    flutterwavePublicKey: "",
    currency: "NGN"
};

const MANUAL_PAYMENT = {
    enabled: true,
    bankName: "First Bank of Nigeria",
    accountName: "PMELAB TECHNOLOGY LIMITED",
    accountNumber: "1234567890",
    instructions: "",
    paymentDeadline: "Please complete payment within 24 hours to avoid order cancellation."
};

const STORE_CONTENT = {
    bannerTitle: "Shop Products",
    bannerSubtitle: "Choose a product, view details, add to cart, and checkout securely.",
    aboutTitle: "About Us",
    aboutText: "We are committed to providing quality products and excellent customer service.",
    contactTitle: "Contact Us",
    contactText: "Need help with an order? Reach out using the details below.",
    refundPolicyTitle: "Refund Policy",
    refundPolicyText: "Refunds are processed according to our refund policy. Please submit a refund request using the refund form and include your order reference.",
    refundFormTitle: "Refund Request",
    refundFormText: "Fill the form below with your order reference and the email used during checkout."
};

const PRODUCTS = [
    {
        id: "pmelab-power-bank",
        title: "PMELAB Power Bank",
        shortTitle: "Power Bank",
        description: "Portable power whenever you need it.",
        longDescription: "A reliable power bank designed for everyday use. Built for convenience with dependable charging performance for your devices.",
        productType: "physical",
        shippingFee: 1500,
        image: "productsimages/image1.jpg",
        images: [
            "productsimages/image1.jpg",
            "productsimages/image2.jpg",
            "productsimages/image3.jpg",
            "productsimages/image4.jpg",
            "productsimages/image5.jpg"
        ],
        specs: [
            { label: "Capacity", value: "20,000mAh" },
            { label: "Ports", value: "USB-A + USB-C" },
            { label: "Fast Charge", value: "Supported" },
            { label: "Warranty", value: "6 months" }
        ],
        packages: [
            { id: "single", title: "Single Unit", price: 25000 },
            { id: "double", title: "2 Units Bundle", price: 48000 }
        ]
    },
    {
        id: "wireless-earbuds",
        title: "Wireless Earbuds",
        shortTitle: "Earbuds",
        description: "Clear sound, strong bass, and stable Bluetooth connection.",
        longDescription: "Enjoy crisp audio and comfortable fit. Perfect for calls, music, and workouts with stable Bluetooth performance.",
        productType: "physical",
        shippingFee: 1200,
        image: "productsimages/image2.jpg",
        images: [
            "productsimages/image2.jpg",
            "productsimages/image3.jpg",
            "productsimages/image4.jpg",
            "productsimages/image1.jpg",
            "productsimages/image5.jpg"
        ],
        specs: [
            { label: "Bluetooth", value: "5.x" },
            { label: "Battery", value: "Up to 20 hours (case)" },
            { label: "Noise Isolation", value: "Passive" },
            { label: "Mic", value: "Built-in" }
        ],
        packages: [
            { id: "standard", title: "Standard Edition", price: 18000 },
            { id: "pro", title: "Pro Edition", price: 26000 }
        ]
    },
    {
        id: "smart-watch",
        title: "Smart Watch",
        shortTitle: "Watch",
        description: "Track your steps, heart rate, and notifications on the go.",
        longDescription: "A stylish smart watch that keeps you connected and helps you track daily activity and wellness features.",
        productType: "physical",
        shippingFee: 1400,
        image: "productsimages/image3.jpg",
        images: [
            "productsimages/image3.jpg",
            "productsimages/image4.jpg",
            "productsimages/image2.jpg",
            "productsimages/image5.jpg",
            "productsimages/image1.jpg"
        ],
        specs: [
            { label: "Display", value: "HD" },
            { label: "Sensors", value: "Heart rate, steps" },
            { label: "Charging", value: "Magnetic" },
            { label: "Water Resistance", value: "Everyday use" }
        ],
        packages: [
            { id: "basic", title: "Basic", price: 22000 },
            { id: "premium", title: "Premium", price: 32000 }
        ]
    },
    {
        id: "bluetooth-speaker",
        title: "Bluetooth Speaker",
        shortTitle: "Speaker",
        description: "Portable speaker with deep sound and long battery life.",
        longDescription: "Compact speaker built for clean sound and portability. Great for indoor and outdoor listening.",
        productType: "physical",
        shippingFee: 1800,
        image: "productsimages/image4.jpg",
        images: [
            "productsimages/image4.jpg",
            "productsimages/image5.jpg",
            "productsimages/image3.jpg",
            "productsimages/image2.jpg",
            "productsimages/image1.jpg"
        ],
        specs: [
            { label: "Output", value: "High power audio" },
            { label: "Battery", value: "Long lasting" },
            { label: "Connectivity", value: "Bluetooth" },
            { label: "Use", value: "Indoor/Outdoor" }
        ],
        packages: [
            { id: "mini", title: "Mini", price: 15000 },
            { id: "max", title: "Max", price: 28000 }
        ]
    },
    {
        id: "usb-c-fast-charger",
        title: "USB-C Fast Charger",
        shortTitle: "Fast Charger",
        description: "Fast and safe charging for phones, tablets, and accessories.",
        longDescription: "A fast-charging adapter designed to power your devices safely with stable performance.",
        productType: "physical",
        shippingFee: 900,
        image: "productsimages/image5.jpg",
        images: [
            "productsimages/image5.jpg",
            "productsimages/image1.jpg",
            "productsimages/image2.jpg",
            "productsimages/image3.jpg",
            "productsimages/image4.jpg"
        ],
        specs: [
            { label: "Port", value: "USB-C" },
            { label: "Safety", value: "Overcurrent protection" },
            { label: "Use", value: "Phones/Tablets" },
            { label: "Build", value: "Compact" }
        ],
        packages: [
            { id: "20w", title: "20W Adapter", price: 8500 },
            { id: "33w", title: "33W Adapter", price: 11000 }
        ]
    },
    {
        id: "data-cable",
        title: "Data Cable",
        shortTitle: "Cable",
        description: "Durable cable for charging and data transfer.",
        longDescription: "A reliable cable built for everyday charging and stable data transfer. Designed to last longer with reinforced build.",
        productType: "physical",
        shippingFee: 700,
        image: "productsimages/5771629618929536855.jpg",
        images: [
            "productsimages/5771629618929536855.jpg",
            "productsimages/image2.jpg",
            "productsimages/image5.jpg",
            "productsimages/image1.jpg",
            "productsimages/image3.jpg"
        ],
        specs: [
            { label: "Durability", value: "Reinforced" },
            { label: "Charging", value: "Fast charge supported" },
            { label: "Data", value: "High-speed transfer" },
            { label: "Length", value: "Standard" }
        ],
        packages: [
            { id: "type-c", title: "USB-C Cable", price: 3500 },
            { id: "lightning", title: "Lightning Cable", price: 4500 },
            { id: "micro", title: "Micro USB Cable", price: 2500 }
        ]
    },
    {
        id: "led-desk-lamp",
        title: "LED Desk Lamp",
        shortTitle: "Desk Lamp",
        description: "Eye-friendly LED lamp for reading and work.",
        longDescription: "A clean desk lamp designed for comfort with adjustable brightness for study and work environments.",
        productType: "physical",
        shippingFee: 1600,
        image: "productsimages/images (4).jpg",
        images: [
            "productsimages/images (4).jpg",
            "productsimages/image4.jpg",
            "productsimages/image3.jpg",
            "productsimages/image5.jpg",
            "productsimages/image2.jpg"
        ],
        specs: [
            { label: "Lighting", value: "LED" },
            { label: "Brightness", value: "Adjustable" },
            { label: "Power", value: "USB/Rechargeable option" },
            { label: "Use", value: "Desk/Reading" }
        ],
        packages: [
            { id: "standard", title: "Standard", price: 13500 },
            { id: "rechargeable", title: "Rechargeable", price: 18500 }
        ]
    },
    {
        id: "phone-stand",
        title: "Phone Stand",
        shortTitle: "Stand",
        description: "Adjustable stand for desk, bed, and video calls.",
        longDescription: "An adjustable stand for comfortable viewing angles during calls, browsing, and content watching.",
        productType: "physical",
        shippingFee: 800,
        image: "productsimages/images (1).png",
        images: [
            "productsimages/images (1).png",
            "productsimages/image1.jpg",
            "productsimages/image2.jpg",
            "productsimages/image3.jpg",
            "productsimages/image4.jpg"
        ],
        specs: [
            { label: "Adjustable", value: "Yes" },
            { label: "Use", value: "Desk/Bed" },
            { label: "Material", value: "Durable build" },
            { label: "Compatibility", value: "Most phones" }
        ],
        packages: [
            { id: "single", title: "Single Stand", price: 4000 },
            { id: "bundle", title: "2-Pack Bundle", price: 7000 }
        ]
    },
    {
        id: "mtn-airtime-voucher",
        title: "MTN Airtime Voucher",
        shortTitle: "MTN Airtime",
        description: "Instant MTN airtime voucher delivery after confirmation.",
        longDescription: "Digital airtime voucher delivered after payment confirmation. Suitable for quick top-ups.",
        productType: "digital",
        shippingFee: 0,
        image: "productsimages/mtn.jpg",
        images: [
            "productsimages/mtn.jpg",
            "productsimages/image1.jpg",
            "productsimages/image2.jpg",
            "productsimages/image3.jpg",
            "productsimages/image4.jpg"
        ],
        specs: [
            { label: "Delivery", value: "Digital" },
            { label: "Network", value: "MTN" },
            { label: "Speed", value: "After confirmation" },
            { label: "Support", value: "Available" }
        ],
        packages: [
            { id: "mtn-1000", title: "₦1,000 Airtime", price: 1000 },
            { id: "mtn-2000", title: "₦2,000 Airtime", price: 2000 },
            { id: "mtn-5000", title: "₦5,000 Airtime", price: 5000 }
        ]
    },
    {
        id: "glo-data-voucher",
        title: "Glo Data Voucher",
        shortTitle: "Glo Data",
        description: "Digital data voucher delivered after payment confirmation.",
        longDescription: "A convenient data voucher delivered digitally after confirmation.",
        productType: "digital",
        shippingFee: 0,
        image: "productsimages/glo.jpg",
        images: [
            "productsimages/glo.jpg",
            "productsimages/image5.jpg",
            "productsimages/image4.jpg",
            "productsimages/image3.jpg",
            "productsimages/image2.jpg"
        ],
        specs: [
            { label: "Delivery", value: "Digital" },
            { label: "Network", value: "Glo" },
            { label: "Speed", value: "After confirmation" },
            { label: "Support", value: "Available" }
        ],
        packages: [
            { id: "glo-2gb", title: "2GB Data", price: 1500 },
            { id: "glo-5gb", title: "5GB Data", price: 3000 },
            { id: "glo-10gb", title: "10GB Data", price: 5500 }
        ]
    }
];

// =========================================================
// 8. PRODUCT FEATURES (Up to 10)
// Reusable feature highlights shown on the store when
// feature sections are rendered on multi-product pages.
// =========================================================
const FEATURES = [
    {
        enabled: true,
        icon: "zap",
        title: "Fast Delivery",
        description: "Orders are processed quickly and dispatched within 24 hours across Nigeria."
    },
    {
        enabled: true,
        icon: "shield",
        title: "Secure Checkout",
        description: "Pay safely online with Paystack, Flutterwave, or verified manual bank transfer."
    },
    {
        enabled: true,
        icon: "headphones",
        title: "Friendly Support",
        description: "Reach us anytime via phone, email, or WhatsApp for help with your order."
    },
    {
        enabled: true,
        icon: "award",
        title: "Quality Products",
        description: "Every product is checked before dispatch to ensure you get genuine quality."
    },
    {
        enabled: true,
        icon: "truck",
        title: "Nationwide Shipping",
        description: "We deliver physical products to every state in Nigeria with trusted logistics."
    },
    {
        enabled: false,
        icon: "",
        title: "",
        description: ""
    }
];

// =========================================================
// 9. DELIVERY CONFIGURATION
// =========================================================
const DELIVERY = {
    enabled: true,
    title: "Fast & Reliable Delivery",
    description: "Your order will be processed and delivered according to our delivery policy. Physical products ship within 24 hours.",
    estimatedTime: "1–5 business days for physical products",
    feeText: "Delivery fees are calculated during checkout based on your location",
    note: "Digital products are delivered instantly after payment confirmation"
};

// =========================================================
// 10. GUARANTEE / TRUST
// =========================================================
const GUARANTEE = {
    enabled: true,
    title: "SHOP WITH CONFIDENCE",
    items: [
        { icon: "shield-check", title: "Quality Checked", description: "Every unit is checked before dispatch." },
        { icon: "headphones", title: "Customer Support", description: "Reach us via phone, email, or WhatsApp." },
        { icon: "lock", title: "Secure Payment", description: "Your payment information is protected." },
        { icon: "truck", title: "Fast Processing", description: "Orders are processed within 24 hours." },
        { icon: "refresh-cw", title: "Easy Returns", description: "Hassle-free return within policy terms." },
        { icon: "award", title: "Genuine Products", description: "Authentic products guaranteed." }
    ]
};

// =========================================================
// 11. TESTIMONIALS (Up to 10)
// =========================================================
const TESTIMONIALS = [
    {
        enabled: true,
        name: "Ahmed Musa",
        location: "Minna, Niger State",
        rating: 5,
        text: "Ordered a power bank and it arrived the next day. Great quality and fast delivery. Highly recommend!",
        image: "productsimages/image5.jpg",
        verifiedBuyer: true
    },
    {
        enabled: true,
        name: "Fatima Ibrahim",
        location: "Abuja",
        rating: 5,
        text: "Customer service on WhatsApp was very helpful. Product quality is excellent and pricing is fair.",
        image: "",
        verifiedBuyer: true
    },
    {
        enabled: true,
        name: "Chinedu Okafor",
        location: "Lagos",
        rating: 4,
        text: "Good value for money. Checkout was smooth and my order arrived as described. Will shop again.",
        image: "",
        verifiedBuyer: true
    },
    {
        enabled: false,
        name: "",
        location: "",
        rating: 5,
        text: "",
        image: "",
        verifiedBuyer: false
    }
];

// =========================================================
// 12. FAQ (Up to 15)
// =========================================================
const FAQ = [
    {
        enabled: true,
        question: "How long does delivery take?",
        answer: "Physical orders are processed within 24 hours and typically delivered in 1–5 business days depending on your location within Nigeria."
    },
    {
        enabled: true,
        question: "Do you deliver nationwide?",
        answer: "Yes, we deliver to all states across Nigeria. Delivery fees may vary based on your location and are calculated at checkout."
    },
    {
        enabled: true,
        question: "What payment methods are available?",
        answer: "We accept online payment via Paystack (card, bank transfer, USSD), Flutterwave, and manual bank transfer for verified orders."
    },
    {
        enabled: true,
        question: "Can I pay manually by bank transfer?",
        answer: "Yes, you can select the manual payment option at checkout. Our bank details will be provided, and your order will be processed once payment is confirmed."
    },
    {
        enabled: true,
        question: "Can I order through WhatsApp?",
        answer: "Absolutely! Click the floating WhatsApp button or any WhatsApp CTA on the site to place your order directly through WhatsApp."
    },
    {
        enabled: true,
        question: "Is there a warranty on products?",
        answer: "Most products come with a manufacturer warranty against manufacturing defects. Details are listed on each product page."
    },
    {
        enabled: true,
        question: "What is your return policy?",
        answer: "We accept returns within 7 days of delivery if the product is unused and in original packaging. Please contact our support team for assistance."
    },
    {
        enabled: true,
        question: "How can I contact support?",
        answer: "You can reach us via phone at +2347040616209, email at support@paymelab.com, or WhatsApp using the floating button on every page."
    },
    {
        enabled: true,
        id: "faq-privacy-policy",
        question: "Privacy Policy",
        answer: "We only collect the information needed to process your order, contact you about your purchase, and provide customer support. Your personal information is handled responsibly and is not sold to third parties."
    },
    {
        enabled: true,
        id: "faq-terms-and-conditions",
        question: "Terms & Conditions",
        answer: "By placing an order on this website, you agree to provide accurate information, complete payment as required, and use the product as intended. We reserve the right to update pricing, product details, and policies when necessary."
    },
    {
        enabled: true,
        id: "faq-refund-policy",
        question: "Refund Policy",
        answer: "Refunds may be approved based on the condition of the product and the circumstances of the order. Please contact support within the allowed review period so we can assess your case and guide you through the next steps. You may also submit a refund request using the Refund Form link in the navigation."
    },
    {
        enabled: true,
        id: "faq-delivery-policy",
        question: "Delivery Policy",
        answer: "Delivery timelines depend on your location and the selected fulfillment method. Physical orders are processed after payment confirmation, and customers will be contacted if there are any unusual delays. Digital products are delivered immediately after confirmation."
    },
    {
        enabled: false,
        question: "",
        answer: ""
    }
];

// =========================================================
// 14. WHATSAPP NUMBERS (Up to 5)
// =========================================================
const WHATSAPP_NUMBERS = [
    {
        enabled: true,
        label: "Sales",
        number: "2347040616209"
    },
    {
        enabled: true,
        label: "Sales 2",
        number: "2348137483459"
    },
    {
        enabled: false,
        label: "Support",
        number: ""
    },
    {
        enabled: false,
        label: "Wholesale",
        number: ""
    }
];

// =========================================================
// 17. SOCIAL MEDIA LINKS
// =========================================================
const SOCIAL_LINKS = {
    instagram: "https://instagram.com/paymelab",
    facebook: "https://facebook.com/paymelab",
    tiktok: "https://tiktok.com/@paymelab",
    youtube: "https://youtube.com/@paymelab",
    twitter: "https://x.com/paymelab"
};

// =========================================================
// 18. LOGO CONFIGURATION
// =========================================================
const LOGO = {
    type: "text", // "image" or "text"
    text: "PMELAB",
    image: "productsimages/logo.jpg",
    alt: "PMELAB TECHNOLOGY LIMITED Logo"
};

// =========================================================
// 19. HEADER NAVIGATION
// These links appear in desktop/mobile header of the store.
// =========================================================
const NAVIGATION = [
    { label: "Home", href: "#home" },
    { label: "Products", href: "#products" },
    { label: "FAQ", href: "#faq" },
    { label: "About", href: "about.html" },
    { label: "Contact", href: "contact.html" },
    { label: "Refund Policy", href: "refund-policy.html" }
];

// =========================================================
// 20. FOOTER LINKS
// =========================================================
const FOOTER_LINKS = {
    quickLinks: [
        { label: "Home", href: "#home" },
        { label: "Products", href: "#products" },
        { label: "FAQ", href: "#faq" },
        { label: "About Us", href: "about.html" },
        { label: "Contact", href: "contact.html" },
        { label: "Refund Form", href: "refund-form.html" }
    ],
    legalLinks: [
        { label: "Privacy Policy", href: "#faq-privacy-policy" },
        { label: "Terms & Conditions", href: "#faq-terms-and-conditions" },
        { label: "Refund Policy", href: "refund-policy.html" },
        { label: "Delivery Policy", href: "#faq-delivery-policy" }
    ]
};

// =========================================================
// 21. SEO CONFIGURATION
// =========================================================
const SEO = {
    title: "PMELAB STORE | Quality Tech Products & Accessories",
    description: "Shop quality tech accessories, gadgets, and digital products from PMELAB TECHNOLOGY LIMITED. Fast delivery, secure checkout, and great prices across Nigeria.",
    keywords: "PMELAB store, tech accessories, Nigeria online store, power bank, gadgets, shop online",
    canonicalUrl: "https://paymelab.com",
    socialImage: "productsimages/image1.jpg"
};

// =========================================================
// 22. ANALYTICS CONFIGURATION
// =========================================================
const ANALYTICS = {
    googleAnalyticsId: "",
    metaPixelId: "",
    googleTagManagerId: ""
};

// =========================================================
// 23. SALES POPUP / LIVE ORDER NOTIFICATIONS
// =========================================================
const SALES_POPUP = {
    enabled: true,
    intervalSeconds: 25,
    displaySeconds: 5,
    initialDelaySeconds: 6,
    titlePrefix: "just purchased",
    amountLabel: "Amount",
    names: [
        "Musa Ali", "Aisha Bello", "Chinedu Okafor", "Fatima Ibrahim", "Ifeanyi Eze",
        "Blessing Daniel", "Suleiman Haruna", "Zainab Usman", "Emmanuel James", "Khadijat Sani",
        "Tochukwu Nwosu", "Maryam Abdullahi", "David Ojo", "Halima Yusuf", "Samuel Peter"
    ]
};

// =========================================================
// 24. PROMOTION / URGENCY
// =========================================================
const PROMOTION = {
    enabled: true,
    title: "Storewide Launch Deal",
    description: "Enjoy great prices across all products this week.",
    endDate: "2026-12-31"
};

// =========================================================
// 25. SOCIAL PROOF GALLERY
// =========================================================
const SOCIAL_PROOF_GALLERY = {
    enabled: true,
    title: "Customer Moments",
    description: "Quality products used and loved by customers every day.",
    images: [
        "productsimages/image3.jpg",
        "productsimages/image4.jpg",
        "productsimages/image5.jpg"
    ]
};

// =========================================================
// 26. ABOUT THE COMPANY
// =========================================================
const COMPANY = {
    enabled: true,
    title: "ABOUT PMELAB TECHNOLOGY LIMITED",
    description: "PMELAB TECHNOLOGY LIMITED is committed to providing reliable tech products and accessories that make everyday life easier. Based in Minna, Niger State, we serve customers across Nigeria with quality products and dependable customer service.",
    mission: "To make reliable technology accessible to everyone in Nigeria.",
    values: ["Quality", "Integrity", "Customer First", "Innovation"]
};

// =========================================================
// 27. TRUST BADGES
// =========================================================
const TRUST_BADGES = [
    { icon: "shield", text: "Secure Payment" },
    { icon: "package", text: "Quality Products" },
    { icon: "message-circle", text: "Customer Support" },
    { icon: "smartphone", text: "Convenient Ordering" },
    { icon: "clock", text: "Fast Processing" },
    { icon: "thumbs-up", text: "Reliable Service" }
];

// =========================================================
// 28. CONTACT SECTION
// =========================================================
const CONTACT = {
    enabled: true,
    title: "GET IN TOUCH",
    subtitle: "Have questions about an order or product? We're here to help.",
    showMap: false,
    mapEmbedUrl: ""
};

// =========================================================
// 31. STICKY CTA CONFIG (Multi-Store Bottom Bar)
// =========================================================
const STICKY_CTA = {
    enabled: true,
    text: "VIEW CART",
    whatsappText: "WHATSAPP"
};

// =========================================================
// DO NOT EDIT BELOW THIS LINE
// =========================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BUSINESS, API_BASE_URL, BRAND, PAYMENT, MANUAL_PAYMENT, STORE_CONTENT, PRODUCTS,
        FEATURES, DELIVERY, GUARANTEE, TESTIMONIALS, FAQ, WHATSAPP_NUMBERS,
        SOCIAL_LINKS, LOGO, NAVIGATION, FOOTER_LINKS, SEO, ANALYTICS, SALES_POPUP,
        PROMOTION, SOCIAL_PROOF_GALLERY, COMPANY, TRUST_BADGES, CONTACT, STICKY_CTA
    };
}
