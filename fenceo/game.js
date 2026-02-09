import * as my from "../mytools.js";

//types.

/**
 * @typedef {object} gametile
 * @property {string} tiletype empty, tile, lblocker
 * @property {number[]} lines 8 items long, each corresponding to an element of dirs, 0 is not present 1... are each groups
 */
/**
 * @typedef {object} refContainer
 * @property {SVGLineElement[]} lineRefs
 * @property {SVGPolygonElement} outlineRef
 * @property {SVGCircleElement} centerRef
 * @property {SVGSVGElement} allRef
 */
/**
 * @typedef {object} loop
 * @property {number[][]} parts
 * @property {number} color
 */
//constants.

const dirs = [[1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]];
const colors = [[0, 0, 0, 1], 
                [0.1, 0.2, 0.9, 1], 
                [0.8, 0.1, 0.2, 1], 
                [0.2, 0.8, 0.1, 1], 
                [0.8, 0.8, 0.1, 1], 
                [0.2, 0.8, 0.8, 1], 
                [0.8, 0.2, 0.9, 1], 
                [0.8, 0.8, 0.8, 1],
                [0.9, 0.5, 0.1, 1],
                [0.5, 0.1, 0.9, 1],
                [0.4, 0.4, 0.4, 1],
                [1, 0.7, 0.6, 1],
                [0.8, 1, 0.7, 1],
                [0.8, 0.6, 1, 1],
                [0.4, 0.1, 0.0, 1],
                [0.0, 0.4, 0.1, 1],
            ];
function getColor(x){
    //now this may seem silly, but please consider that it was the path of least resistance and i am incredibly lazy and also ate thinking about the future
    return x == -1 ? "white" : my.ColorArrayToCSS(colors[x]);
}
function canLink(a, b){
    return (a == b || a == -1 || b == -1) && (a != 0) && (b != 0)
}
const outlineColor = [0.7, 0.7, 0.7, 1];
const activeBackgroundColor = [0.2, 0.2, 0.2, 1];
const cellBackgroundColor = [0.1, 0.1, 0.1, 1];

const gameWidth = 6;
const gameHeight = 9;
const tilesize = 40; //have to update in css too

const defaultRules = {
    "1c4": {gravity: false, colors: 1, generators: [{type: "tile", weight: 1, lines: "c1,n4", wcenter: false}]},
	"2c33": {gravity: false, colors: 2, generators: [{type: "tile", weight: 1, lines: "c1,n3 c2,n3", wcenter: false}]},
	"3cx": {gravity: false, colors: 3, generators: [{type: "tile", weight: 1, lines: "c1,n4,d1357", wcenter: false}]},
	"4c44": {gravity: false, colors: 4, generators: [{type: "tile", weight: 1, lines: "c1,n4 c2,n4", wcenter: false}]},
	"4cp": {gravity: false, colors: 4, generators: [{type: "tile", weight: 1, lines: "c1,n4,d0246", wcenter: false}]},
	"7cs": {gravity: false, colors: 7, generators: [{type: "tile", weight: 1, lines: "c1,n8", wcenter: false}]},
}
const tileProperties = ["lines", "wcenter"];
const tileTypes = ["tile", "lblocker"]; //empty is not needed here, this is a list of what can be dropped

const propertyTitles = {
    lines: "Lines: ",
    wcenter: "Wild center "
};
const usedProperties = {
    empty: [],
    tile: ["lines", "wcenter"],
    lblocker: []
}
const generatorInputTypes = {
    lines: "text",
    wcenter: "checkbox"
}
const propertyDefaults = {
    lines: "",
    wcenter: false
}

function readInput(u){
    switch (u.type){
        case "text": return u.value;
        case "number": return Number(u.value);
        case "checkbox": return u.checked;
    }
}
function setInput(u, v){
    switch (u.type){
        case "text": return u.value = v;
        case "number": return u.value = v;
        case "checkbox": return u.checked = v;
    }
}

//variables.

/** @type {gametile[][]} */
var gameState = [];
/** @type {refContainer[][]} */
var refs = [];
var stats = {
    score: 0,
    cleared: 0
}
var currentTileJ = 3;
/**@type {gametile} */
var currentTile = getTile();
/**@type {gametile} */
var nextTile = getTile();

/**@type {refContainer} */
var nextRefs = {};

const dropguideRef = document.getElementById("dropguide");

var gameRunning = true;

var savedCustomRules = [];
var currentCustomRule = structuredClone(defaultRules["2c33"]);
var lastCustomRule = structuredClone(defaultRules["2c33"]);

function getCurrentRule(){
    return (gameType == "custom" ? currentCustomRule : defaultRules[gameType]) || defaultRules["2c33"];
}
//construct.

var windows = ["customrule", "help"];
var currentWindow = "";
function showWindow(name){
    currentWindow = name;
	for (let i of windows){
		document.getElementById(i).style.display = "none";
	}
    if (windows.includes(name)){
        document.getElementById(name).style.display = "block";
    }
}

//make wild line.
for (let i = 0; i < dirs.length; i++){
    var tempGrad = document.getElementById("wildgrad").cloneNode(true);
    tempGrad.setAttribute("x1", `50%`);
    tempGrad.setAttribute("y1", `50%`);
    tempGrad.setAttribute("x2", `${(1+dirs[i][1])*50}%`);
    tempGrad.setAttribute("y2", `${(1+dirs[i][0])*50}%`);
    tempGrad.id = `wildgrad${i}`;
    document.getElementById("grads").appendChild(tempGrad);
}

/**@returns {refContainer} */
function makeTileElement(container){
    /**@type {refContainer} */
    var elementRefs = {}
    elementRefs.lineRefs = []
    var currentSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    elementRefs.allRef = currentSvg;
    currentSvg.style.backgroundColor = my.ColorArrayToCSS(cellBackgroundColor);
    currentSvg.setAttribute("viewBox", "0 0 40 40");
    currentSvg.setAttribute("fill", "none");
    for (let d of dirs){
        var currentLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        currentLine.setAttribute("x1", "50%");
        currentLine.setAttribute("y1", "50%");
        currentLine.setAttribute("x2", `${(d[1]+1)*50}%`);
        currentLine.setAttribute("y2", `${(d[0]+1)*50}%`);
        currentLine.setAttribute("stroke", my.ColorArrayToCSS(colors[0]));
        currentLine.setAttribute("stroke-width", "5");
        currentLine.setAttribute("stroke-linecap", "round");
        elementRefs.lineRefs.push(currentLine);
        currentSvg.appendChild(currentLine);
    }
    var currentOutline = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    currentOutline.setAttribute("points", `0,0 ${tilesize},0 ${tilesize},${tilesize} 0,${tilesize}`);
    currentOutline.setAttribute("stroke", my.ColorArrayToCSS(cellBackgroundColor));
    currentOutline.setAttribute("stroke-width", "5");
    currentOutline.setAttribute("stroke-linecap", "round");
    currentSvg.appendChild(currentOutline);
    elementRefs.outlineRef = currentOutline;

    var currentCenter = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    currentCenter.setAttribute("cx", "50%");
    currentCenter.setAttribute("cy", "50%");
    currentCenter.setAttribute("r", "19%");
    currentSvg.appendChild(currentCenter);
    elementRefs.centerRef = currentCenter;
    
    container.appendChild(currentSvg);
    return elementRefs;
}

//setup game.

var gameElement = document.getElementById("game");
for (let i = 0; i < gameHeight; i++){
    gameState.push([]);
    refs.push([]);
    var row = document.createElement("tr");
    gameElement.appendChild(row);
    for (let j = 0; j < gameWidth; j++){
        gameState[i].push({});
        refs[i].push({});
        var ucell = document.createElement("td");
        ucell.classList.add("tile");
        row.appendChild(ucell);
        var cell = document.createElement("div");
        cell.classList.add("utile");
        ucell.appendChild(cell);
        gameState[i][j].tiletype = "empty";
        refs[i][j] = makeTileElement(cell);
    }
}
/**
 * takes in i,j returns in x,y order, use index+1/2 for center coords.
 * @param {number[]} x 
 * @returns {number[]}
 */
function getTileCoords(x){
    return [x[1]*(tilesize+2), x[0]*(tilesize+2)];
}

nextRefs = makeTileElement(document.getElementById("dpiece"));
var resetFlag = false;

var cleanGame = structuredClone(gameState); 
var gameType = "2c33";
var lastGameType = "2c33";
function resetGame(){
    if (animationRunning){
        animationRunning = false;
        resetFlag = true;
    }
    resetFlag = false;
    gamemode.value = gameType;
    gameState = structuredClone(cleanGame);
    stats.cleared = 0;
    stats.score = 0;
    currentTile = getTile();
    nextTile = getTile();
    render();
    document.getElementById("dscore").textContent = "0";
    document.getElementById("dcleared").textContent = "0";
    document.getElementById("gameover").style.display = "none";
    gameRunning = true;
}
document.cloneNode()
/**
 * 
 * @param {refContainer} r 
 * @param {gametile} t 
 */
function drawTile(t, r){

    switch (t.tiletype) {
        case "empty":
            r.allRef.style.backgroundColor = my.ColorArrayToCSS(cellBackgroundColor);
            r.outlineRef.setAttribute("stroke",  my.ColorArrayToCSS(colors[0]));
            for (let i = 0; i < dirs.length; i++){
                r.lineRefs[i].setAttribute("stroke", my.ColorArrayToCSS(colors[0]));
            }
            r.centerRef.setAttribute("fill", "none");
        break;
        case "tile":
            r.allRef.style.backgroundColor = my.ColorArrayToCSS(activeBackgroundColor);
            r.outlineRef.setAttribute("stroke",  my.ColorArrayToCSS(outlineColor));
            for (let i = 0; i < dirs.length; i++){
            if (t.lines[i] == -1){
                r.lineRefs[i].setAttribute("stroke", `url(#wildgrad${i})`);
            }
            else {
                r.lineRefs[i].setAttribute("stroke", my.ColorArrayToCSS(colors[t.lines[i]]));
            }
            r.centerRef.setAttribute("fill", t.wcenter ? "url(#wildgradr)" : "none");
        }
        break;
        case "lblocker":
            r.allRef.style.backgroundColor = my.ColorArrayToCSS([0.6,0.6,0.6,1]);
            r.outlineRef.setAttribute("stroke",  my.ColorArrayToCSS(outlineColor));
            for (let i = 0; i < dirs.length; i++){
                r.lineRefs[i].setAttribute("stroke", my.ColorArrayToCSS([0.65,0.65,0.65,1]));
            }
            r.centerRef.setAttribute("fill", "none");
        break;
    }
}

function render(){
    for (let i = 0; i < gameHeight; i++){
        for (let j = 0; j < gameWidth; j++){
            drawTile(gameState[i][j], refs[i][j]);
        }
    }
    drawTile(currentTile, refs[0][currentTileJ]);
    drawTile(nextTile, nextRefs);
    var guidePoints = [[1, currentTileJ], [1, currentTileJ+1], [findDroppedI()+1, currentTileJ+1], [findDroppedI()+1, currentTileJ]];
    guidePoints = guidePoints.map(x => getTileCoords(x));
    dropguideRef.setAttribute("points", guidePoints.map(x => x.join(",")).join(" "));
}
function findDroppedI(){
    var out = 0;
    for (let i = 1; i < gameHeight; i++){
        if (gameState[i][currentTileJ].tiletype == "empty"){
            out = i;
        }
        else {
            break;
        }
    }
    return out;
}
function dropStep(){
    if (findDroppedI() == 0){return;}
    gameState[findDroppedI()][currentTileJ] = currentTile;
    currentTile = nextTile;
    nextTile = getTile();
    combo = 1;
    afterDrop();
    render();
}
function leftStep(){
    currentTileJ = Math.max(currentTileJ-1, 0);
    render();
}
function rightStep(){
    currentTileJ = Math.min(currentTileJ+1, gameWidth-1);
    render();
}
function rotatePiece(){
    currentTile.lines = currentTile.lines.map((x, i, a) => a[(i+2)%8]);
    render();
}

/**
 * @param {string[]} s 
 */
function ob(s){
    var out = {}
    for (let t of s){
        out[t[0]] = t.slice(1).split("").map(x => x=="w" ? -1 : Number(x));
    }
    return out;
}


/**
 * given with abstract colors, map to real colors if needed
 * @param {string} lstr 
 */
function generateLines(lstr){
    //c1,n4; c2,n2,d0246,o1
    var out = [0,0,0,0,0,0,0,0];
    var p = lstr.split(" ").map(x => ob(x.split(",")));
    for (let r of p){
        var availablePositions = Object.hasOwn(r, "d") ? r.d : my.iota(8);
        var overwritable = Object.hasOwn(r, "o") ? r.o : [0];
        availablePositions = availablePositions.filter(x => overwritable.includes(out[x]));
        var useDirs = my.indexMap(availablePositions, my.randomChoose(availablePositions.length, Math.min(r.n[0], availablePositions.length)));
        for (let d of useDirs){
            out[d] = r.c[0];
        }
    }
    return out;
}

function checkLinegen(lstr){
    var p = lstr.split(" ").map(x => ob(x.split(",")));
    var result = [];
    for (let i = 0; i < p.length; i++){
        for (let e of Object.keys(p[i])){
            if (!["c","n","d","o"].includes(e)){
                result.push(["badkey", i, e]);
            }
            if (p[i][e].includes(NaN)){
                result.push(["badval", i, e]);
            }
        }
        if (!Object.hasOwn(p[i], "n")){
            result.push(["non", i]);
        } else if (p[i].n.length != 1){
            result.push(["longn", i]);
        }
        if (!Object.hasOwn(p[i], "c")){
            result.push(["noc", i]);
        } else if (p[i].c.length != 1){
            result.push(["longc", i]);
        }
        if (Object.hasOwn(p[i], "d") && p[i].d.filter(x => x >= dirs.length || x < 0).length != 0){
            result.push(["manyd", i]);
        }
    }
    //all required properties are present
    if (Math.max(...p.filter(r => Object.hasOwn(r, "c")).map(r => (r.c[0]))) > currentCustomRule.colors){
        result.push(["manycolors"]);
    }
    return result;
}

function checkCustomRule(){
    var hasError = false;
    var errorString = "";
    var ecount = 0;
    //global errors
    if (currentCustomRule.generators.map(x => x.weight).reduce((x,y) => x+y, 0) == 0){
        hasError = true;
        ecount++;
        errorString += "<br># Generator weights mustn't sum to 0";
    }
    for (let i = 0; i < currentCustomRule.generators.length; i++){
        var g = currentCustomRule.generators[i];
        if (usedProperties[g.type].includes("lines")){
            var lineErrors = checkLinegen(g.lines);
            hasError ||= lineErrors.length != 0;
            ecount += lineErrors.length;
            var p = `<br># Generator ${i+1}: `;
            for (let le of lineErrors){
                switch (le[0]){
                    case "badkey":
                        errorString += p+`Statement ${le[1]+1} has invalid key "${le[2]}"`;
                    break;
                    case "badval":
                        errorString += p+`Statement ${le[1]+1} has bad value in key "${le[2]}" (need numbers, +w in c/o)`;
                    break;
                    case "non":
                        errorString += p+`Statement ${le[1]+1} is missing requred key "n"`;
                    break;
                    case "longn":
                        errorString += p+`Statement ${le[1]+1} has incorrect number of values for key "n" (need 1)`;
                    break;
                    case "noc":
                        errorString += p+`Statement ${le[1]+1} is missing requred key "c"`;
                    break;
                    case "longc":
                        errorString += p+`Statement ${le[1]+1} has incorrect number of values for key "c" (need 1)`;
                    break;
                    case "manyd":
                        errorString += p+`Statement ${le[1]+1} has out of bounds values for key "d" (need 0~7)`;
                    break;
                    case "manycolors":
                        errorString += p+`Too many uniqure colors (need at most rule value)`;
                    break;
                }
            }
        }
    }
    errorString = (ecount == 0 ? "" : `Errors (${ecount}):`) + errorString;
    document.getElementById("globalerror").innerHTML = errorString;
    return hasError;
}

function getTile(){
    gameType ||= "2c33"; //sometimes its undefined (???) so we add a fallback
    var rule = gameType == "custom" ? currentCustomRule : defaultRules[gameType];
    var generator = rule.generators[my.fromDist(rule.generators.map(x => x.weight))];
    var outtile = {};
    outtile.tiletype = generator.type;
    for (let p of usedProperties[generator.type]){
        var addval = null;
        switch (p){
            case "lines":
                var useColors = my.randomPermutation(rule.colors).map(x => x+1);
                useColors.unshift(0); //handle color 0 = void
                addval = generateLines(generator.lines).map(x => (x==0 || x==-1) ? x : useColors[x]);
            break;
            case "wcenter":
                addval = generator.wcenter;
        }
        outtile[p] = addval;
    }
    return outtile;
}

/**@type {loop[]} loop index - loc list - [i, j, dir]*/
var foundLoops = [];
function afterDrop(){
    //find all loops
    foundLoops = [];
    var looptable = [];
    for (let il = 0; il < gameHeight; il++){
        looptable.push([]);
        for (let jl = 0; jl < gameWidth; jl++){ //if we just us array(height).fill(...) the entries becom entangled
            looptable[il].push([{parts: [], color: -1}]);
        }
    }
    var firstPass = true;
    while (looptable.flat(1000).length > 0){
        looptable = loopFindIteration(looptable, firstPass);
        firstPass = false;
    }

    //{parts: [], color: -1}
    

    //remove mirror image loops
    //mirror dir = conjugate of next dir
    for (let i = 0; i < foundLoops.length; i++){
        var l = foundLoops[i].parts;
        var lm = [];
        for (let k = 0; k < l.length; k++){
            lm.push([l[k][0], l[k][1], (l[(k-1+l.length) % l.length][2]+4)%8]);
        }
        if (foundLoops.map(x => isSubset(x.parts, lm)).includes(true) || foundLoops.map((x,w) => isSubset(x.parts, l) && i != w).includes(true)){
            foundLoops.splice(i, 1);
            i--;
        }
    }
    processClears(foundLoops);
}
/**
 * @param {loop[][][]} table
 * @param {number[][]} history 
 */
function loopFindIteration(table, firstPass){
    /**@type {loop[][][]} */
    var newTable = [];
    for (let il = 0; il < gameHeight; il++){
        newTable.push([]);
        for (let jl = 0; jl < gameWidth; jl++){ //if we just us array(height).fill(...) the entries becom entangled
            newTable[il].push([]);
        }
    }
    for (let i = 0; i < gameHeight; i++){
        for (let j = 0; j < gameWidth; j++){
            lf: for (let l = 0; l < table[i][j].length; l++){
                var toPropogate = table[i][j][l];
                //decide which messages should be propagated
                var directionlessLoops = toPropogate.parts.map(x => [x[0], x[1]]); //we only need the block coordinates to check if we looped back
                for (let p = 0; p < toPropogate.parts.length; p++){
                    if (arrayEq(directionlessLoops[p], last(directionlessLoops)) && p != directionlessLoops.length-1){
                        //check if the colors match on the joining block (it may have changed if a wild was passed)
                        var joinBlock = my.arrayIndex(gameState, directionlessLoops[p]);
                        var firstC = joinBlock.lines[toPropogate.parts[p][2]];
                        var lastC = joinBlock.lines[(toPropogate.parts[toPropogate.parts.length - 2][2]+4)%8];
                    if (canLink(firstC, lastC)){
                        if (p == 0){
                            //loop has been found, report to hq
                            var toAdd = structuredClone(toPropogate);
                            toAdd.parts.pop();//last entry is when we looped back
                            foundLoops.push(toAdd);
                        }
                        //loop with peperiod, will be added by a later run
                        continue lf;
                    }}
                }

                //no loop, we propogate
                for (let d = 0; d < dirs.length; d++){
                    if (gameState[i][j].tiletype != "tile") {continue;}
                    var loopColor = firstPass ? gameState[i][j].lines[d] : toPropogate.color;
                    if (loopColor == 0) {continue;}
                    if (canLink(gameState[i][j].lines[d], loopColor) || (gameState[i][j].wcenter && gameState[i][j].lines[d] != 0)){
                        for (let w = 1; i+w*dirs[d][0] < gameHeight && 
                                        i+w*dirs[d][0] >= 0 && 
                                        j+w*dirs[d][1] < gameWidth &&
                                        j+w*dirs[d][1] >= 0 
                        ; w++){
                            var checkingPart = [i+w*dirs[d][0], j+w*dirs[d][1], (d+4)%8];
                            if (gameState[checkingPart[0]][checkingPart[1]].tiletype != "tile") {continue;}
                            var checkingColor = gameState[checkingPart[0]][checkingPart[1]].lines[checkingPart[2]];
                            if (checkingColor == 0) {continue;}
                            if (canLink(checkingColor, loopColor)){// if there is a place to land
                            if (!arrayIncludes(toPropogate.parts, checkingPart)){//and we are in new territory
                            if (toPropogate.parts.length == 0 || (d+4)%8 != last(toPropogate.parts)[2]){ //and this isn't a turnaround
                                var toAppend = structuredClone(toPropogate); //juuuuust to make sure
                                toAppend.parts.push([i, j, d]);
                                toAppend.color = checkingColor; //something's messed up here
                                newTable[checkingPart[0]][checkingPart[1]].push(toAppend);
                            }}}
                        }
                    }
                }
            }
        }
    }
    return newTable;
}
/**
 * is y a subset of x?
 * @param {*} x 
 * @param {*} y 
 * @returns 
 */
function isSubset(x, y){
    var subsetFlag = true;
    for (let yp of y){
        subsetFlag &&= x.map(xp => my.lexicographicOrder(xp, yp)).includes(0);
    }
    return subsetFlag;
}
function arrayIncludes(x, y){
    return x.map(q => my.lexicographicOrder(q, y)).includes(0);
}
function arrayEq(x, y){
    return my.lexicographicOrder(x, y) == 0;
}
/**
 * @param {Array} a 
 */
function last(a){
    return a[a.length-1];
}

var animationRunning = false;
var clearLineRefs = [];
var clearGradRefs = [];
var clearGradColorRefs = [];

var combo = 1;
//process will need to take some kind of state parameter,
/**
 * 
 * @param {loop[]} loops 
 * @param {number} i 
 * @param {number} combo 
 */
async function processClears(loops){
    animationRunning = true;
    var toDelete = [];

    // loop animaton
    for (let l of loops){
        document.getElementById("clearlines").style.display = "block";
        var tileMidpoints = l.parts.map(x => getTileCoords([x[0]+1/2, x[1]+1/2]));
       for (let cl of clearLineRefs){
            cl.style.display = "none";
       }
       for (let k = 0; k < l.parts.length; k++){
            var prevCoordinate = l.parts[(k-1+l.parts.length) % l.parts.length];
            var inCoordinate = l.parts[k];
            var outCoordinate = l.parts[(k+1) % l.parts.length];

            var lineCoordinate = inCoordinate.slice(0,2);
            if (!arrayIncludes(toDelete, lineCoordinate)){
                toDelete.push(structuredClone(lineCoordinate));
            }
            while (!arrayEq(lineCoordinate, outCoordinate.slice(0,2))){
                if (gameState[lineCoordinate[0]][lineCoordinate[1]].tiletype == "lblocker" && !arrayIncludes(toDelete, lineCoordinate)){
                    toDelete.push(structuredClone(lineCoordinate));
                }
                lineCoordinate[0] += dirs[inCoordinate[2]][0];
                lineCoordinate[1] += dirs[inCoordinate[2]][1];
            }

            if (k >= clearLineRefs.length){
                //construct a new one
                var newGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
                document.getElementById("grads").appendChild(newGrad);
                newGrad.id = `cleargrad${k}`;
                newGrad.setAttribute("gradientUnits", "userSpaceOnUse");
                clearGradRefs.push(newGrad);

                var newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                document.getElementById("clearlines").appendChild(newLine);
                newLine.id = `clearline${k}`;
                clearLineRefs.push(newLine);
                newLine.setAttribute("stroke", `url(#cleargrad${k})`);

                var inStop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                inStop.setAttribute("offset", "0%");
                newGrad.appendChild(inStop);
                var outStop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                outStop.setAttribute("offset", "100%");
                newGrad.appendChild(outStop);
                clearGradColorRefs.push([inStop, outStop]);
            }
            var nowLine = clearLineRefs[k];
            var nowGrad = clearGradRefs[k];
            var nowGradColors = clearGradColorRefs[k];
            
            var inPoint = getTileCoords(inCoordinate.map(x => x+1/2));
            var outPoint = getTileCoords(outCoordinate.map(x => x+1/2));

            nowLine.style.display = "block";
            
            nowLine.setAttribute("x1", inPoint[0]);
            nowLine.setAttribute("x2", outPoint[0]);
            nowLine.setAttribute("y1", inPoint[1]);
            nowLine.setAttribute("y2", outPoint[1]);

            nowGrad.setAttribute("x1", inPoint[0]);
            nowGrad.setAttribute("x2", outPoint[0]);
            nowGrad.setAttribute("y1", inPoint[1]);
            nowGrad.setAttribute("y2", outPoint[1]);

            var prevColor = gameState[inCoordinate[0]][inCoordinate[1]].lines[(prevCoordinate[2]+4)%8];
            var inColor = gameState[inCoordinate[0]][inCoordinate[1]].lines[inCoordinate[2]];
            var outColor = gameState[outCoordinate[0]][outCoordinate[1]].lines[(inCoordinate[2]+4)%8];
            var nextColor = gameState[outCoordinate[0]][outCoordinate[1]].lines[outCoordinate[2]];
            var useInColor = inColor == -1 ? prevColor : inColor;
            var useOutColor = outColor == -1 ? nextColor : outColor;

            nowGradColors[0].setAttribute("stop-color", getColor(useInColor));
            nowGradColors[1].setAttribute("stop-color", getColor(useOutColor));
       }
        document.getElementById("clearloopunder").setAttribute("points", tileMidpoints.map(x => x.join(",")).join(" "));
        document.getElementById("clearscore").style.display = "block";
        document.getElementById("clearscore").textContent = (loops.length*l.parts.length*combo)**2;
        document.getElementById("clearscore").style.top = `${tileMidpoints.reduce((a, b) => a + b[1], 0)/tileMidpoints.length}px`;
        document.getElementById("clearscore").style.left = `${tileMidpoints.reduce((a, b) => a + b[0], 0)/tileMidpoints.length}px`;
        document.getElementById("clearscore").style.color = getColor(l.color);
        stats.score += (loops.length*l.parts.length*combo)**2;
        document.getElementById("dscore").textContent = stats.score;
        if (resetFlag){
            document.getElementById("clearscore").style.display = "none";
            document.getElementById("clearlines").style.display = "none";
            document.getElementById("clearloopunder").setAttribute("points", "");
            resetFlag = false;
            return;
        }
        await my.sleep(500 / Math.max(1, Math.sqrt(loops.length)/3));
    }

    document.getElementById("clearscore").style.display = "none";
    document.getElementById("clearlines").style.display = "none";
    document.getElementById("clearloopunder").setAttribute("points", "");
    for (let d of toDelete){
        gameState[d[0]][d[1]].tiletype = "empty";
        stats.cleared++;
    }
    document.getElementById("dcleared").textContent = stats.cleared;
    var overCheck = true;
    for (let j = 0; j < gameWidth; j++){
        overCheck &&= gameState[1][j].tiletype != "empty";
    }
    if (overCheck){
        //game over...
        document.getElementById("gameover").style.display = "block";
        gameRunning = false;
    }
    render();
    
    if (getCurrentRule().gravity && loops.length != 0){
        if (resetFlag){
            resetFlag = false;
            return;
        }
        await my.sleep(60);
        var dropflag = true;
        while (dropflag){
            dropflag = false;
            for (let i = gameHeight-2; i >= 0; i--){
                for (let j = 0; j < gameWidth; j++){
                    if (gameState[i+1][j].tiletype == "empty" && gameState[i][j].tiletype != "empty" ){
                        gameState[i+1][j] = structuredClone(gameState[i][j]);
                        gameState[i][j].tiletype = "empty";
                        dropflag = true;
                    }
                }
            }
            await my.sleep(60);
            render();
        }
        combo += 1;
        afterDrop();
    }
    else {
        animationRunning = false;
    }
    return; 
}

document.addEventListener("keydown", (k) => {
    if (animationRunning || !gameRunning || currentWindow != "") {return;}
	switch (k.key){
		case "ArrowRight":
		case "d":
		case "D":
			rightStep();
			break;
		case "ArrowLeft":
		case "a":
		case "A":
			leftStep();
			break;
        case "ArrowUp":
		case "w":
		case "W":
			rotatePiece();
			break;
		case "ArrowDown":
		case "s":
		case "S":
        case " ":
			dropStep();
			break;
    }
});
document.getElementById("creset").addEventListener("click", (e) =>{
    resetGame();
});
document.getElementById("chelp").addEventListener("click", (e) =>{
    showWindow("help");
});

function renderCustomRulePart(){
    document.getElementById("customrulecolors").value = currentCustomRule.colors;
    document.getElementById("customrulegravity").checked = currentCustomRule.gravity;
    document.getElementById("generators").innerHTML = "";
    
    for (let g of currentCustomRule.generators){
        var nextdiv = document.createElement("div");
        nextdiv.classList.add("gencontainer")

        var d = document.createElement("span");
        d.textContent = "Type: ";
        nextdiv.appendChild(d);
        
        var ts = document.createElement("select");
        for (let p of tileTypes){
            var tspart = document.createElement("option");
            tspart.value = p;
            tspart.textContent = p;
            tspart.selected = (g.type == p);
            ts.appendChild(tspart);
        }
        ts.addEventListener("change", (e) => {
            g.type = e.target.value;
            renderCustomRulePart();
        });
        nextdiv.appendChild(ts);

        var dw = document.createElement("span");
        dw.textContent = " Weight: ";
        nextdiv.appendChild(dw);

        var iw = document.createElement("input");
        iw.type = "number"
        iw.addEventListener("change", (e) => {g.weight = readInput(e.target); renderCustomRulePart();});
        setInput(iw, g.weight);
        nextdiv.appendChild(iw);

        nextdiv.appendChild(document.createElement("br"));

        for (let p of usedProperties[g.type]){
            var d = document.createElement("span");
            d.textContent = " " + propertyTitles[p];
            nextdiv.appendChild(d);

            var s = document.createElement("input");
            s.type = generatorInputTypes[p]
            s.addEventListener("change", (e) => {g[p] = readInput(e.target); renderCustomRulePart();});
            setInput(s, g[p]);
            nextdiv.appendChild(s);
        }

        document.getElementById("generators").appendChild(nextdiv);
    }
}
document.getElementById("customrulecolors").addEventListener("change", (e) =>{
    currentCustomRule.colors = Math.floor(Math.min(Math.max(Number(e.target.value), 1), 15));
    renderCustomRulePart();
});

document.getElementById("customrulegravity").addEventListener("change", (e) =>{
    currentCustomRule.gravity = readInput(e.target);
    renderCustomRulePart();
});

document.getElementById("caddgen").addEventListener("click", (e) =>{
    currentCustomRule.generators.push({type: "tile", weight: 1, lines: "", wcenter: false});
    renderCustomRulePart();
});
document.getElementById("csubgen").addEventListener("click", (e) =>{
    currentCustomRule.generators.pop();
    renderCustomRulePart();
});

document.getElementById("ccustommode").addEventListener("click", (e) =>{
    showWindow("customrule");
    lastCustomRule = structuredClone(currentCustomRule);
    renderCustomRulePart();
});

document.getElementById("customruleoperation").addEventListener("change", (e) => {
    switch (e.target.value){
        case "":
        break;
        case "save":
            currentCustomRule.name = prompt("Enter ruleset name");
            savedCustomRules.push(structuredClone(currentCustomRule));
        break;
        case "delete":
            ruleop = "delete";
            initRuleSelector();
        break;
        case "use":
            ruleop = "use";
            initRuleSelector();
        break;
        default:
        break;
    }
});
var ruleop = "";
function initRuleSelector(){
    document.getElementById("customrules").innerHTML = "";
    var itop = document.createElement("option");
    itop.textContent = "(Select rule, or this to cancel)";
    itop.addEventListener("click", (e) => {
        document.getElementById("customrules").innerHTML = "";
        document.getElementById("customruleoperation").value = "";
        ruleop = "";
    });
    document.getElementById("customrules").appendChild(itop);
    for (let i = 0; i < savedCustomRules.length; i++){
        var opt = document.createElement("option");
        opt.textContent = savedCustomRules[i].name;
        opt.addEventListener("click", (e) => {
            switch (ruleop){
                case "delete":
                    savedCustomRules.splice(i, 1);
                break;
                case "use":
                    currentCustomRule = structuredClone(savedCustomRules[i]);
                    renderCustomRulePart();
                break;
                default:
                break;
            }

            document.getElementById("customrules").innerHTML = "";
            document.getElementById("customruleoperation").value = "";
            ruleop = "";
        });
        document.getElementById("customrules").appendChild(opt);
    }
}

document.getElementById("cwindowclose").addEventListener("click", (e) =>{
    //add checks for lines being good...
    if (!checkCustomRule()){
        showWindow("");
        resetGame();
    }
});
document.getElementById("cwindowcancel").addEventListener("click", (e) =>{
    showWindow("");
    console.log(gameType, lastGameType);
    gameType = structuredClone(lastGameType);
    if (gameType == "custom"){
        currentCustomRule = structuredClone(lastCustomRule);
    }
    resetGame();
});

document.getElementById("hwindowclose").addEventListener("click", (e) =>{
    showWindow("");
});


for (let i = 0; i < document.getElementById("gamemode").options.length; i++){
    document.getElementById("gamemode").options[i].addEventListener("click", (e) =>{
        console.log(e.target.value);
        lastGameType = structuredClone(gameType);
        gameType = structuredClone(e.target.value);
        resetGame();
        document.getElementById("gamemode").blur();
    });
}

window.addEventListener("beforeunload", (e) => {
    localStorage.setItem("fenceorules", JSON.stringify(savedCustomRules));
});

var loadsave = localStorage.getItem("fenceorules");
if (loadsave) {
    savedCustomRules = JSON.parse(loadsave);
}
else {
    savedCustomRules = [];
}

resetGame();