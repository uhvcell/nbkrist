// Shared Team Data - Edit this file to update both Team Page and Home Page Marquee

const facultyCoordinators = [
    {
        name: "Dr. V. Vijay Kumar Reddy",
        role: "Chairperson",
        detail: "Director, NBKRIST",
        icon: "fa-user-tie",
        image: "director.jpg"
    },
    {
        name: "Dr. M. Srinivasulu",
        role: "Convener",
        detail: "Principal, NBKRIST",
        icon: "fa-chalkboard-user",
        image: "srinivasulu.jpg"
    },
    {
        name: "Mrs. B. Raghavamma",
        role: "UHV Coordinator",
        detail: "Dept. of S&H",
        icon: "fa-user-gear",
        image: "raghavamma.jpg"
    },
    {
        name: "Mr. K. Narendra",
        role: "UHV Co-Coordinator",
        detail: "Dept. of S&H",
        icon: "fa-user",
        image: "narendra.jpg"
    },
];

const studentCoordinators = [
    // Student Row
    {
        name: "T. Varunemdhar Reddy",
        role: "Student Coordinator",
        detail: "",
        icon: "fa-graduation-cap",
        image: "varun.jpg"
    },
    {
        name: "V.Bramhani",
        role: "Student Co-Coordinator",
        detail: "",
        icon: "fa-user-graduate",
        image: "bramhani.jpg"
    },
    {
        name: "P.Charuhaaini",
        role: "Student Co-Coordinator",
        detail: "",
        icon: "fa-user-graduate",
        image: "charuhaaini.jpg"
    },
    {
        name: "N.Prathyush",
        role: "Student Co-Coordinator",
        detail: "",
        icon: "fa-user-graduate",
        image: "prathyush.jpg"
    },
    {
        name: "K.Chandu",
        role: "Student Co-Coordinator",
        detail: "",
        icon: "fa-user-graduate",
        image: "chandu.jpg"
    },
    // Technical Row
    {
        name: "G.LAKSHMIDHAR REDDY",
        role: "TECHNICAL COORDINATOR",
        detail: "",
        icon: "fa-code",
        image: "lakshmidhar.png"
    },
    {
        name: "M.Manoj",
        role: "Technical Co-Coordinator",
        detail: "",
        icon: "fa-code-branch",
        image: "manoj.jpg"
    },
    {
        name: "R.Mahesh",
        role: "Technical Co-Coordinator",
        detail: "",
        icon: "fa-code-branch",
        image: "mahesh.jpg"
    },
    // Skill Row
    {
        name: "K.Rithika Reddy",
        role: "Skill Coordinator",
        detail: "",
        icon: "fa-pencil",
        image: "rithika.jpg"
    },
    {
        name: "V.Rakshitha Reddy",
        role: "Skill Co-Coordinator",
        detail: "",
        icon: "fa-pencil-ruler",
        image: "rakshitha.jpg"
    },
    {
        name: "SK.Latheef",
        role: "Skill Co-Coordinator",
        detail: "",
        icon: "fa-user-pen",
        image: "latheef.jpg"
    },
    // Content Row
    {
        name: "Y.Mahidhar Reddy",
        role: "Content Coordinator",
        detail: "",
        icon: "fa-file-lines",
        image: "mahidhar.png"
    },
    {
        name: "A.Ajay Kumar",
        role: "Content Co-Coordinator",
        detail: "",
        icon: "fa-file-pen",
        image: "ajay_kumar.jpg"
    },
    {
        name: "O.Penchal Das",
        role: "Content Co-Coordinator",
        detail: "",
        icon: "fa-file-pen",
        image: "penchal_das.jpg"
    },
    {
        name: "P.Lokanadh",
        role: "Content Co-Coordinator",
        detail: "",
        icon: "fa-file-pen",
        image: "lokanadh.jpg"
    },
    {
        name: "G.Varalakshmi",
        role: "Content Co-Coordinator",
        detail: "",
        icon: "fa-file-pen",
        image: "varalakshmi.jpg"
    },
];

// Combined list for marquee
const allTeamMembers = [...facultyCoordinators, ...studentCoordinators];
