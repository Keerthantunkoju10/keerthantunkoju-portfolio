/**
 * ==========================================================================
 * KEERTHAN TUNKOJU PORTFOLIO - DEFAULT DATA STORE
 * Acts as the default state and template for the online-editable CMS.
 * ==========================================================================
 */

const defaultPortfolioData = {
  profile: {
    name: "Keerthan Tunkoju",
    avatar: "Assets/keerthan-photo.jpg",
    role: "Entry-Level Software Developer &bull; AI &amp; ML Graduate",
    statusText: "Available for Software Developer &amp; AI/ML Roles",
    headlineStart: "Hi, I'm ",
    headlineAccent: "Keerthan Tunkoju",
    headlineEnd: ".",
    heroDescription: "Computer Science graduate specializing in Artificial Intelligence & Machine Learning and practicing GIS Engineer at NeoGeoInfo Technologies. Experienced in deep learning computer vision, predictive ML pipelines, spatial data engineering, and modern web applications.",
    aboutLead: "AI/ML-focused Computer Science graduate & practicing GIS Engineer with a passion for software engineering.",
    aboutP1: "I graduated with a B.Tech in Computer Science & Engineering (Artificial Intelligence & Machine Learning) from Sri Indu Institute of Engineering & Technology. My academic journey provided rigorous training in Machine Learning, Deep Learning, Data Structures & Algorithms, and Database Management Systems.",
    aboutP2: "Currently, I work as a GIS Engineer at NeoGeoInfo Technologies Ltd., where I deliver production-ready urban GIS databases for the Greater Hyderabad Municipal Corporation (GHMC). I specialize in spatial data digitization, topology validation, and attribute QA/QC across roads, electric networks, drainage, water bodies, and civic infrastructure using ArcGIS, QGIS, Google Earth, and Global Mapper.",
    aboutP3: "In addition to spatial engineering, I have delivered end-to-end Machine Learning solutions—including deep learning CNNs for brain tumor medical imaging and supervised agricultural crop yield prediction models—and built responsive web applications during industry internships with Bharat Intern, CodSoft, and Intrainz.",
    stats: [
      { number: "AI & ML", label: "B.Tech Specialization" },
      { number: "GHMC", label: "Urban GIS Mapping" },
      { number: "3+", label: "Internships Completed" }
    ],
    contact: {
      email: "keerthantunkoju10@gmail.com",
      phone: "+91 6281151724",
      location: "Hyderabad, Telangana, India (Open to Relocation / Remote)",
      linkedin: "https://linkedin.com/in/keerthan-tunkoju-a24604258",
      linkedinDisplay: "linkedin.com/in/keerthan-tunkoju-a24604258",
      github: "https://github.com/Keerthantunkoju10",
      githubDisplay: "github.com/Keerthantunkoju10"
    }
  },
  experience: [
    {
      id: "exp-1",
      role: "GIS Engineer",
      company: "NeoGeoInfo Technologies Ltd.",
      period: "Feb 2026 – Present",
      bullets: [
        "Digitized urban infrastructure layers including roads, footpaths, electric network, drainage, water bodies, parks, buildings, and land parcels for the Greater Hyderabad Municipal Corporation (GHMC).",
        "Execute spatial data validation and topology correction to ensure geometric integrity and compliance with project standards.",
        "Conduct attribute QA/QC using Excel, verifying data completeness, consistency, and accuracy across GIS layers.",
        "Create and manage GIS layers for multi-stakeholder urban projects, delivering production-ready urban GIS databases supporting city planning.",
        "Tools utilized: ArcGIS, QGIS, Google Earth, Global Mapper, and Microsoft Excel."
      ]
    },
    {
      id: "exp-2",
      role: "Python Programming Intern",
      company: "CodSoft",
      period: "Oct 2023 – Nov 2023",
      bullets: [
        "Built a feature-complete To-Do List application in Python with task addition, deletion, and persistent state storage.",
        "Developed a GUI-based Calculator handling arithmetic computations, floating-point numbers, and error edge cases.",
        "Implemented a Password Generator with configurable length, character sets, and entropy-based strength scoring."
      ]
    },
    {
      id: "exp-3",
      role: "Web Developer Intern",
      company: "Bharat Intern",
      period: "Sep 2023 – Oct 2023",
      bullets: [
        "Designed and deployed a responsive personal Portfolio website using HTML5, CSS3, and JavaScript showcasing projects and skills.",
        "Built an interactive Temperature Converter tool supporting Celsius, Fahrenheit, and Kelvin conversions with real-time UI feedback.",
        "Recreated the Netflix Homepage as a responsive UI exercise, mastering CSS layout techniques, Flexbox, and component structuring."
      ]
    },
    {
      id: "exp-4",
      role: "Web Developer Intern",
      company: "Intrainz",
      period: "Jun 2023 – Aug 2023",
      bullets: [
        "Developed a full Hotel website frontend using HTML, CSS, and JavaScript including room booking UI, responsive photo gallery, and contact form.",
        "Completed structured industrial training covering modern front-end development workflows and software engineering best practices."
      ]
    }
  ],
  skills: [
    {
      id: "cat-1",
      title: "Languages & Web",
      desc: "Programming languages and web technologies used for core application development.",
      tags: ["Python", "C & C++", "JavaScript", "SQL (MySQL)", "HTML5", "CSS3 (Flexbox & Grid)"]
    },
    {
      id: "cat-2",
      title: "AI & Machine Learning",
      desc: "Computer vision, deep learning neural networks, and predictive modeling.",
      tags: ["Convolutional Neural Networks (CNN)", "Deep Learning", "Supervised Learning", "scikit-learn", "Medical Image Segmentation", "Model Evaluation & Tuning"]
    },
    {
      id: "cat-3",
      title: "GIS & Spatial Engineering",
      desc: "Geographic Information Systems tools, urban digitization, and spatial quality control.",
      tags: ["ArcGIS", "QGIS", "Google Earth", "Global Mapper", "Spatial Data Digitization", "Topology Validation & QA/QC"]
    },
    {
      id: "cat-4",
      title: "Tools, Data & Leadership",
      desc: "Workflow tooling, relational databases, and collaborative team competencies.",
      tags: ["Git & GitHub", "MySQL Database", "Microsoft Excel (Data QA)", "Problem Solving", "Team Leadership", "Technical Communication"]
    }
  ],
  projects: [
    {
      id: "proj-1",
      title: "Deep Learning Methods for Identifying Brain Tumors",
      categoryBadge: "Deep Learning / Healthcare",
      mockupSub: "CNN Segmentation &bull; BraTS",
      gradientClass: "preview-gradient-1",
      tags: ["Python", "CNN", "Deep Learning", "Watershed"],
      description: "Built automated semantic segmentation models using Convolutional Neural Networks (CNN) and watershed algorithms on the BraTS MRI dataset. Deployed a responsive web interface allowing healthcare practitioners to execute inference directly without manual ML environment setups.",
      githubUrl: "https://github.com/Keerthantunkoju10",
      liveUrl: ""
    },
    {
      id: "proj-2",
      title: "Crop Yield Prediction Using Machine Learning",
      categoryBadge: "Machine Learning / Agriculture",
      mockupSub: "Predictive ML Pipeline",
      gradientClass: "preview-gradient-2",
      tags: ["Python", "scikit-learn", "Supervised Learning"],
      description: "Engineered an end-to-end ML pipeline modeling complex non-linear relationships between soil profiles, meteorological records, and agricultural management practices. Conducted systematic benchmarking across multiple supervised algorithms to achieve high prediction efficiency and low relative error.",
      githubUrl: "https://github.com/Keerthantunkoju10",
      liveUrl: ""
    },
    {
      id: "proj-3",
      title: "Urban Infrastructure Spatial Mapping (GHMC)",
      categoryBadge: "GIS & Spatial Engineering",
      mockupSub: "GHMC Urban Infrastructure",
      gradientClass: "preview-gradient-3",
      tags: ["ArcGIS", "QGIS", "Topology QA", "Excel"],
      description: "Led digitization and topological validation of municipal utilities—including road networks, electrical infrastructure, drainage, water bodies, parks, and land parcels—for the Greater Hyderabad Municipal Corporation, delivering a production-ready spatial database for city administration.",
      githubUrl: "",
      liveUrl: "#experience"
    },
    {
      id: "proj-4",
      title: "Hotel Booking Website & Utility Suite",
      categoryBadge: "Frontend & Python Tools",
      mockupSub: "Web & Python Suite",
      gradientClass: "preview-gradient-1",
      tags: ["HTML5", "CSS3", "JavaScript", "Python"],
      description: "Developed a responsive Hotel Website frontend with room booking UI, image gallery, and contact validation. Additionally engineered Python desktop tools including a GUI calculator, persistent to-do app, and an entropy-based password generator.",
      githubUrl: "https://github.com/Keerthantunkoju10",
      liveUrl: ""
    }
  ],
  education: [
    {
      id: "edu-1",
      degree: "B.Tech in Computer Science & Engineering (AI & ML)",
      institute: "Sri Indu Institute of Engineering & Technology",
      period: "2020 – 2024",
      score: "CGPA: 6.6 / 10.0",
      desc: "Relevant Coursework: Machine Learning, Deep Learning, Data Structures & Algorithms, Database Management Systems (DBMS), Computer Networks."
    },
    {
      id: "edu-2",
      degree: "Intermediate — MPC (Maths, Physics, Chemistry)",
      institute: "Narayana Jr College",
      period: "2018 – 2020",
      score: "Percentage: 75%",
      desc: "Foundational coursework in advanced mathematics, analytical reasoning, and physical sciences."
    }
  ],
  certifications: [
    {
      id: "cert-1",
      title: "Web Development Internship Certification",
      org: "Intrainz",
      year: "2023"
    },
    {
      id: "cert-2",
      title: "Python Programming Internship Certification",
      org: "CodSoft",
      year: "2023"
    }
  ]
};

// Export for module systems or attach to global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = defaultPortfolioData;
}
