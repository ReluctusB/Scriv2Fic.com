/* This is an utter Frankenstein-esque mess, and I'm sorry. */

/* --Imports-- */
const RibosomalRTF = require("RibosomalRTF");

/* Builds HTML elements according to a properties object (propObj) */
function eleBuilder(eleStr, propObj) {
    const ele = document.createElement(eleStr);
    if (propObj.class) {ele.className = propObj.class;}
    if (propObj.HTML) {ele.innerHTML = propObj.HTML;}
    if (propObj.text) {ele.innerText = propObj.text;}
    if (propObj.id) {ele.id = propObj.id;}
    if (propObj.type) {ele.type = propObj.type;}
    if (propObj.value) {ele.value = propObj.value;}
    if (propObj.style) {ele.style = propObj.style;}
    if (propObj.event) {ele.addEventListener(propObj.event[0], propObj.event[1], false);}
    return ele;
}

function dataBinder() {
    let unboundControllers = document.querySelectorAll("[data-unbound]")
    unboundControllers.forEach(ele => {
        switch (ele.dataset.unbound) {
            case "fileinterface":
                FileInt = new FileInterface().bind(ele);
                ele.removeAttribute("data-unbound-controller")
                break;
            default:       
        }
    });
}

class CompileDocument {
    constructor() {
        this.title = "";
        this.chapters = [];
        this.body = "";
    }
}

class Chapter {
    constructor() {
        this.title = "";
        this.scrivenings = [];
        this.body = "";
    }
}

class Controller {
    constructor() {
        this.boundEle = undefined;
    }
    bind(element) {
        this.boundEle = element;
    }
}

class FileInterface extends Controller {
    constructor() {
        super();
        this.breakSelector = undefined;
        this.breakStyle = undefined;
        this.dividerDatalist = undefined;
        this.scrivTitle = undefined;
        this.scrivDir = undefined;
        this.submitScriv = undefined;

        this.scrivSelector = undefined;
        this.outputField = undefined;
        this.clipButton = undefined;

        this.fileList = [];
        this.lowLevel = 0;
        this.scrivX = undefined;
    }
    bind(element) {
        this.boundEle = element;
        this.breakSelector = document.getElementById("breakSelector");
        this.breakStyle = document.getElementById("breakStyle");
        this.dividerDatalist = document.getElementById("dividerInput");
        this.scrivTitle = document.getElementById("scrivTitle");
        this.scrivSelector = document.getElementById("scrivdrop");
        this.scrivDir = document.getElementById("scrivDir");
        this.submitScriv = document.getElementById("submitScriv");
        this.outputField = document.getElementById("outputfield");
        this.clipButton = document.getElementById("clipbutton");

        this.scrivSelector.addEventListener("input",()=>{
            this.process(this.scrivSelector.files);
        });
        this.submitScriv.addEventListener("click",()=>{
            this.submit();
        });
        this.clipButton.addEventListener("click",()=>{
            navigator.clipboard.writeText(this.outputField.value);
        });
    }
    /* Finds a .scrivx file from a filelist */
    findScrivx() {
        for (let i=0;i<this.fileList.length;i++) {
            if (this.fileList[i].name.endsWith(".scrivx")) {
                this.scrivX = this.fileList[i];
                return;
            }
        }
        document.getElementById("errorDisplay").innerText = "Couldn't find a .scrivx file.";
        return;
    }
    /* Finds a file from a filelist by name. If none found, returns null. 
    The way Scrivener handles empty documents means that sometimes there are references in the 
    .scrivx to files that don't exist, so we don't throw an error on missing files and just 
    skip over them for compilation.*/
    findFileByName(fileName, fileList) {
        for (let i=0;i<fileList.length;i++) {
            if (fileList[i].name === fileName) {
                return fileList[i];
            }
        }
        console.log("Couldn't find file " + fileName);
        return null;
    }
    /* Processes files */
    process(fileList) {
        this.fileList = fileList;
        this.findScrivx();
        if (this.scrivX === undefined) {return;}
        this.buildDirectory(this.scrivX);
    }
    /* Processes a scrivx file and generates a directory of documents */
    buildDirectory(scrivx) {
        /* Selects or deselects all children of a file (me) in the file tree to be included in the compile */
        function checkChildren(me) {
            const includeBoxes = document.getElementsByClassName("compileIncludeBox");
            const thisIndex = [...includeBoxes].indexOf(me);
            for (let i=thisIndex+1;i<includeBoxes.length;i++) {
                if (parseInt(includeBoxes[i].dataset.level) > parseInt(me.dataset.level)) {
                    includeBoxes[i].checked = me.checked;
                } else {
                    return;
                }
            }
        }
        function onread(evt) {
            const scrivxContents = evt.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(scrivxContents, "text/xml");
            this.scrivTitle.innerText = this.scrivX.name.replace(".scrivx","");
            const topLevelFiles = xmlDoc.querySelectorAll("Binder > BinderItem[Type=DraftFolder]");
            this.buildHierarchy(topLevelFiles, 0);
            const includeBoxes = document.getElementsByClassName("compileIncludeBox");
            for (let i=0;i<includeBoxes.length;i++) {includeBoxes[i].addEventListener("change", function() {checkChildren(this);});}
            /* Sets the options for the "Break on chapter level" selector. */
            for (let i=0;i<=this.lowLevel;i++) {
                this.breakSelector.innerHTML += `<option value="${i}">${i}</option>`
            }
            this.breakSelector.addEventListener("change",function() {
                document.getElementById("breakStyle").innerHTML = `.level${this.value}{text-decoration:underline;}`
            });
            this.submitScriv.disabled = false;
        };
        const reader = new FileReader();
        reader.readAsText(scrivx, "UTF-8");
        let boundOnRead = onread.bind(this);
        reader.onload = boundOnRead;
    }
    buildHierarchy(fileList, level) {
        function generateListing(file, level) {
            let titleEle = file.getElementsByTagName("Title")[0].childNodes[0];
            let title = "";
            if (titleEle) {
                title = titleEle.nodeValue;
            } else {
                title = "Untitled-" + untitledNo;
                untitledNo++;
            }
            const ident = file.getAttribute("Type") != "Folder" ? file.getAttribute("ID") : "Folder";
            let icon = "🗎";
            let hierDisplay = level > 1 ? "none" : "flex";
            let include = file.getElementsByTagName("IncludeInCompile")[0] ? true : false;
            let hasChildren = ""
            if (file.getAttribute("Type").endsWith("Folder")) {icon = "🗁";}
            let listString = `<span class='checkbox' style="margin-left: ${(level*2).toString()}rem">
                                <label>
                                    <input type='checkbox' class='compileIncludeBox' data-identifier='${ident}' data-level='${level}' data-title='${title}' ${include?"checked":""}>
                                </label>
                            </span>
                            <span class="level${level}">${icon} ${title}</span>`;
            return eleBuilder("LI",{HTML:listString, class:title, value:level, style:"display:"+hierDisplay});
        }

        if (level > this.lowLevel) {this.lowLevel = level;}
        let untitledNo = 1;
        for (let i=0;i<fileList.length;i++) {
            const listing = generateListing(fileList[i], level);
            this.scrivDir.appendChild(listing);
            let kids = fileList[i].getElementsByTagName("Children")[0];
            if (kids) {this.buildHierarchy(kids.children, level + 1);}       
        }
    }
    submit() {
        this.submitScriv.disabled = true;
        const breakType = this.dividerDatalist.value;

        /* Waits for all documents to have been processed */
        function waitForProcess() {
            if (startedOperations === finishedOperations && startedOperations + finishedOperations !== 0) {
                console.log(startedOperations + "/" + finishedOperations);
                console.log("Processing complete!");
                compile(compiledDocument);
            } else {
                console.log(startedOperations + "/" + finishedOperations);
                setTimeout(waitForProcess,1000);
            }
        }

        function compile(documentObj) {
            //console.log(documentObj);
            let compiledOutput = "";

            documentObj.forEach((contents, title, maptar) => {
                compiledOutput += `\n\n[center][h2]${title}[/h2][/center]\n\n`;
                let j = 0;
                contents.forEach((body, id, map) => {
                    compiledOutput += body;
                    if (map.size - 1 > j) {
                        compiledOutput += breakType + "\n\n";
                    }
                    j++;
                });  
            });

            document.getElementById("outputfield").value = compiledOutput
            document.getElementById("submitScriv").disabled = false;
        }

        let compiledDocument = new Map();
        const includeBoxes = document.getElementsByClassName("compileIncludeBox");
        let currentChapter = null;
        let chapterNo = 0

        let startedOperations = 0, finishedOperations = 0;
        
        for (let i=0;i<includeBoxes.length;i++) {
            if (includeBoxes[i].checked) {
                if (parseInt(includeBoxes[i].dataset.level) == this.breakSelector.value) {
                    chapterNo++;
                    currentChapter = new Map()
                    compiledDocument.set(includeBoxes[i].dataset.title, currentChapter);       
                }
                if (includeBoxes[i].dataset.identifier === "Folder") {continue;}
                const reader = new FileReader();
                let cChap = currentChapter;
                reader.onload = async function() {
                    const bbcode = await rtfToBBCode(reader.result);
                    cChap.set(includeBoxes[i].dataset.identifier, bbcode);
                    //console.log(bbcode);
                    finishedOperations++;
                }
                const foundFile = this.findFileByName(includeBoxes[i].dataset.identifier + ".rtf", this.fileList);
                if (foundFile !== null) {
                    currentChapter.set(includeBoxes[i].dataset.identifier, "");
                    startedOperations++;
                    reader.readAsText(foundFile);
                }
            }
        }

        if (chapterNo === 0) {
            displayError("No documents for compilation on selected chapter break point.");
            return;
        }

        waitForProcess()

    }
}

class BBCodeBuilder {
    constructor() {
        this.domObj = {};
        this.curGroup = {};
        this.stack = [];
        this.curStyle = {alignment: "left", listlevel:-1, foreground:{}};
        this.output = "";

        this.tagTable = {
            italics: "i",
            bold: "b",
            underline: "u",
            strikethrough: "s",
            smallcaps: "smcaps",
            superscript: "sup",
            subscript: "sub",
            foreground: "color",
            hyperlink: "url"
        }
    }
    rgbToHex(rgbObject) {
        let outStr = "#"
        let rgbArray = [rgbObject.red, rgbObject.green, rgbObject.blue];
        rgbArray.forEach(val => {
            let hex = parseInt(val).toString(16);
            outStr += hex.length == 1 ? "0" + hex : hex;
        });
        return outStr;
    }
    parseObject(rtfObj) {
        this.domObj = rtfObj;
        this.domObj.contents.forEach((group) => {
            this.curGroup = group;
            this.output += this.processTopLevelGroup(this.curGroup);
        });

        return this.output;
    }
    processTopLevelGroup(group) {
        let groupString = "";

        /* Open alignment tags */
        if (group.style.alignment) {
            if (group.style.alignment !== "left" && group.style.alignment !== "justified") {
                groupString += "[" + group.style.alignment + "]";
            }
        }

        /* List handling */
        if (group.style.ilvl >= 0) {
            if (group.style.ilvl > this.curStyle.listlevel) {
                const style = this.dom.listtable[group.style.ls - 1].levels[group.style.ilvl].attributes.nfc;
                if (style === 23 || style > 4) {
                    groupString += "[list]\n";
                } else {
                    const listTypes = "1IiAa";
                    groupString += "[list=" + listTypes.charAt(style) + "]\n";
                }               
            } else if (group.style.ilvl < this.curStyle.listlevel) {
                for (let i=0;i<this.curStyle.listlevel-group.style.ilvl;i++) {
                    groupString += "[/list]";
                }       
            }
            groupString += "[*]";
            this.curStyle.listlevel = group.style.ilvl
        } else if (this.curStyle.listlevel !== -1) {
            while (this.curStyle.listlevel > -1) {
                groupString += "[/list]";
                this.curStyle.listlevel--;
            }
        }

        group.contents.forEach((subgroup) => {
            if (subgroup.type === "text" || subgroup.type === "span" || subgroup.type === "fragment") {
                groupString += this.processSubGroup(subgroup);
            }
        });

        /* Closing remaining character tags */
        if (this.stack.length) {
            let stackLevel = this.stack.length;
            while (stackLevel > 0) {
                if (this.stack[stackLevel-1] === "foreground") {this.curStyle.foreground = {}}
                groupString += "[/" + this.tagTable[this.stack[stackLevel-1]] + "]";
                this.stack.splice(stackLevel-1, 1);
                stackLevel --;
            }
        }

        /* Closing alignment */
        if (group.style.alignment) {
            if (group.style.alignment !== "left" && group.style.alignment !== "justified") {
                groupString += "[/" + group.style.alignment + "]"
            }
        }

        if (group.type === "paragraph") {
            groupString += "\n\n";
        } else if (group.type === "listitem") {
            groupString += "\n";
        }

        return groupString;
    }

    processSubGroup(group) {
        let groupString = "";

        /* Closing tags from previous subgroup */
        if (this.stack.length) {
            let stackLevel = this.stack.length;
            while (stackLevel > 0) {
                if (this.stack[stackLevel-1] === "foreground" && group.style.foreground !== this.curStyle.foreground) {
                    groupString += "[/color]";
                    this.stack.splice(stackLevel-1, 1);
                } else if (!group.style[this.stack[stackLevel-1]]) {
                    if (this.stack[stackLevel-1] === "foreground") {this.curStyle.foreground = {}}
                    groupString += "[/" + this.tagTable[this.stack[stackLevel-1]] + "]";
                    this.stack.splice(stackLevel-1, 1);
                }       
                stackLevel --;
            }
        }

        /* Opening tags */
        Object.keys(this.tagTable).forEach(tag => {
            if (group.style[tag] && !this.stack.includes(tag)) {
                if (tag === "foreground") {
                    groupString += "[color=" + this.rgbToHex(group.style.foreground) + "]";
                    this.curStyle.foreground = group.style.foreground;
                    this.stack.push("foreground");
                } else {
                    this.stack.push(tag);
                    groupString += "[" + this.tagTable[tag] + "]";
                }
            }           
        });

        /* Handling contents */
        if (typeof group.contents === "string") {
            if (group.type === "field" && group.attributes.fieldtype === "HYPERLINK") {
                if (group.attributes.fieldvalue.includes("scrivcmt:")) {
                    //hopefully something will go here one day
                    groupString += group.contents;
                } else if (group.attributes.fieldvalue.includes("mailto:")){
                    groupString += "[email]"
                                + group.attributes.fieldvalue.replace("mailto:","")
                                + "[/email]";
                } else {
                    groupString += "[url=" + group.attributes.fieldvalue + "]"
                                + group.contents
                                + "[/url]";
                }           
            } else if (group.type != "listtext") {
                groupString += group.contents;
            }
        } else {
            group.contents.forEach(subgroup => {
                if (typeof subgroup === "string") {
                    groupString += subgroup;
                } else {
                    groupString += this.processSubGroup(subgroup);
                } 
            });
        }

        return groupString.replace(/[\n\r]/g, "");
    }
}

async function rtfToBBCode(rtfString) {
    const builder = new BBCodeBuilder;
    const parsedRTFObj = await RibosomalRTF.parseString(rtfString);
    //console.log(parsedRTFObj)
    return builder.parseObject(parsedRTFObj);
}

window.addEventListener("load", () => {
    dataBinder();
}, false);
