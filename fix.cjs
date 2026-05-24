const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'AdminPanel.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Match the exact broken tag pattern (with flexibile whitespace)
const regex = />\s*<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\}\)/s;

if (regex.test(content)) {
    content = content.replace(regex, `>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed successfully');
} else {
    console.log('Target regex not found');
}
