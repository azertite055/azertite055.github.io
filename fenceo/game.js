import * as my from "../mytools.js";

//types.

/**
 * @typedef {object} gametile
 * @property {boolean} exists
 * @property {number[]} lines 8 items long, each corresponding to an element of dirs, 0 is not present 1... are each groups
 */
/**
 * @typedef {object} refContainer
 * @property {SVGLineElement[]} lineRefs
 * @property {SVGPolygonElement} outlineRef
 * @property {SVGSVGElement} allRef
 */
/**
 * @typedef {object} loop
 * @property {number[][]} parts
 * @property {number} color
 */
//constants.

const dirs = [[1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]];
const colors = [[0, 0, 0, 1], [0.1, 0.2, 0.9, 1], [0.8, 0.1, 0.2, 1], [0.2, 0.8, 0.1, 1], [0.8, 0.7, 0.1, 1], [0.2, 0.8, 0.8, 1], [0.8, 0.2, 0.9, 1], [0.7, 0.7, 0.7, 1]];
const outlineColor = [0.7, 0.7, 0.7, 1];
const activeBackgroundColor = [0.23, 0.23, 0.23, 1];
const cellBackgroundColor = [0.13, 0.13, 0.13, 1];

const gameWidth = 6;
const gameHeight = 9;
const tilesize = 40; //have to update in css too

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

//construct.

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
        gameState[i][j] = {exists: false, lines: [0,0,0,0,0,0,0,0]};
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

var cleanGame = structuredClone(gameState); 
var gameType = "2c33";
function resetGame(){
    if (animationRunning){
        clearTimeout(animationId);
        processClears([], 10, 0); //run after animation cleanup routine
    }
    gameState = structuredClone(cleanGame);
    stats.cleared = 0;
    stats.score = 0;
    gameType = gamemode.value
    currentTile = getTile();
    nextTile = getTile();
    render();
    document.getElementById("dscore").textContent = "0";
    document.getElementById("dcleared").textContent = "0";
    document.getElementById("gameover").style.display = "none";
    gameRunning = true;
}

/**
 * 
 * @param {refContainer} r 
 * @param {gametile} t 
 */
function drawTile(t, r){
    r.allRef.style.backgroundColor = t.exists ? activeBackgroundColor : cellBackgroundColor;
    r.outlineRef.setAttribute("stroke",  my.ColorArrayToCSS(t.exists ? outlineColor : colors[0]));
    for (let i = 0; i < dirs.length; i++){
        r.lineRefs[i].setAttribute("stroke", my.ColorArrayToCSS(colors[t.lines[i]]));
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
var droppedPos = [-1, -1];
function findDroppedI(){
    var out = 0;
    for (let i = 1; i < gameHeight; i++){
        if (!gameState[i][currentTileJ].exists){
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
function getTile(){
    var b = my.randomPermutation(8);
    var out = [0,0,0,0,0,0,0,0];
    switch (gameType){
        case "1c4":
            for (let i = 0; i < 4; i++){
                out[b[i]] = 1;
            }
        break;
        case "2c33":
            for (let i = 0; i < 6; i++){
                out[b[i]] = 1 + Math.floor(i/3);
            }
        break;
        break;
        case "4c44":
            var c = my.randomChoose(4, 2);
            for (let i = 0; i < 8; i++){
                out[b[i]] = 1 + c[Math.floor(i/4)];
            }
        break;
        case "4cp":
            var c = my.randomChoose(4, 1);
            for (let i = 0; i < 8; i+=2){
                out[i] = 1 + c[0];
            }
        break;
        case "3cx":
            var c = my.randomChoose(3, 1);
            for (let i = 1; i < 8; i+=2){
                out[i] = 1 + c[0];
            }
        break;
        case "7cs":
            var c = my.randomChoose(7, 1);
            for (let i = 0; i < 8; i++){
                out[i] = 1 + c[0];
            }
        break;
    }
    return {exists: true, lines: out};
}

/**@type {loop[]} loop index - loc list - [i, j, dir]*/
var foundLoops = [];
/**@type {number[][]} */
var checkedThisRun = [];
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
    while (looptable.flat(1000).length > 0){
        looptable = loopFindIteration(looptable);
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
    processClears(foundLoops, 0, 1);
}
/**
 * @param {loop[][][]} table
 * @param {number[][]} history 
 */
function loopFindIteration(table){
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
                        if (p == 0){
                            //loop has been found, report to hq
                            var toAdd = structuredClone(toPropogate);
                            toAdd.parts.pop();//last entry is when we looped back
                            foundLoops.push(toAdd);
                        }
                        //loop with peperiod, will be added by a later run
                        continue lf;
                    }
                }    
                //no loop, we propogate
                for (let d = 0; d < dirs.length; d++){
                    var loopColor = toPropogate.color == -1 ? gameState[i][j].lines[d] : toPropogate.color;
                    if (loopColor == 0) {continue;}
                    if (gameState[i][j].lines[d] == loopColor){
                        for (let w = 1; i+w*dirs[d][0] < gameHeight && 
                                        i+w*dirs[d][0] >= 0 && 
                                        j+w*dirs[d][1] < gameWidth &&
                                        j+w*dirs[d][1] >= 0 
                        ; w++){
                            var checkingPart = [i+w*dirs[d][0], j+w*dirs[d][1], (d+4)%8];
                            if (gameState[checkingPart[0]][checkingPart[1]].lines[checkingPart[2]] == loopColor){// if there is a place to land
                            if (!arrayIncludes(toPropogate.parts, checkingPart)){//and we are in new territory
                            if (toPropogate.parts.length == 0 || (d+4)%8 != last(toPropogate.parts)[2]){ //and this isn't a turnaround
                                var toAppend = structuredClone(toPropogate); //juuuuust to make sure
                                toAppend.parts.push([i, j, d]);
                                toAppend.color = loopColor;
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
var animationId = 0;
/**
 * 
 * @param {loop[]} loops 
 * @param {number} i 
 * @param {number} combo 
 */
function processClears(loops, i, combo){
    animationRunning = true;
    if (i < loops.length){
        //fanciful animations WILL go here;
        document.getElementById("clearloop").setAttribute("stroke", my.ColorArrayToCSS(colors[loops[i].color]));
        var tileMidpoints = loops[i].parts.map(x => getTileCoords([x[0]+1/2, x[1]+1/2]));
        document.getElementById("clearloop").setAttribute("points", tileMidpoints.map(x => x.join(",")).join(" "));
        document.getElementById("clearloopunder").setAttribute("points", tileMidpoints.map(x => x.join(",")).join(" "));
        document.getElementById("clearscore").style.display = "block";
        document.getElementById("clearscore").textContent = (loops.length*loops[i].parts.length*combo)**2;
        document.getElementById("clearscore").style.top = `${tileMidpoints.reduce((a, b) => a + b[1], 0)/tileMidpoints.length}px`;
        document.getElementById("clearscore").style.left = `${tileMidpoints.reduce((a, b) => a + b[0], 0)/tileMidpoints.length}px`;
        document.getElementById("clearscore").style.color = my.ColorArrayToCSS(colors[loops[i].color]);
        document.getElementById("clearscore").style.outlineColor = my.ColorArrayToCSS(colors[loops[i].color]);
        stats.score += (loops.length*loops[i].parts.length*combo)**2;
        document.getElementById("dscore").textContent = stats.score;
        animationId = setTimeout(processClears, 500, loops, i+1, combo);
        return;
    }
    else {//after the fanciful animations
        document.getElementById("clearscore").style.display = "none";
        document.getElementById("clearloop").setAttribute("points", "");
        document.getElementById("clearloopunder").setAttribute("points", "");
        var toDelete = [];
        var tilesInLoops = loops.map(x => x.parts.map(y => [y[0], y[1]])).flat(1);
        for (let l of tilesInLoops){
            if (!toDelete.map(x => my.lexicographicOrder(x,l)).includes(0)){
                toDelete.push(l);
            }
        }
        for (let d of toDelete){
            gameState[d[0]][d[1]] = {exists: false, lines:[0,0,0,0,0,0,0,0]};
            stats.cleared++;
        }
        document.getElementById("dcleared").textContent = stats.cleared;
        animationRunning = false;
        var overCheck = true;
        for (let j = 0; j < gameWidth; j++){
            overCheck &&= gameState[1][j].exists;
        }
        if (overCheck){
            //game over...
            document.getElementById("gameover").style.display = "block";
            gameRunning = false;
        }
        render();
        return; 
        /* 
        //gravity, if we want it
        for (let iBottom = gameHeight-2; iBottom <= 0; iBottom--){
            for (let i = iBottom; i <= 0; i--){
                for (let j = 0; j < gameWidth; j++){
                    if ((!gameState[i+1][j].exists) && gameState[i][j].exists){
                        gameState[i+1][j] = structuredClone(gameState[i][j]);
                        gameState[i][j] = {exists: false, lines:[0,0,0,0,0,0,0,0]};
                    }
                }
            }
        }
        */
    }
}

document.addEventListener("keydown", (k) => {
    if (animationRunning || !gameRunning) {return;}
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
})
resetGame();