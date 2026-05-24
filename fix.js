const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'AdminPanel.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `                            >
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}`;

const replacementStr = `                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed successfully');
} else {
    console.log('Target string not found');
}
