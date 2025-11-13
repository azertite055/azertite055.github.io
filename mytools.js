//Useful Tool's

/**
 * @callback animFunction
 * @param {number} t Elapsed time in ms
 * @param {*} base Unmodified value
 * @returns {*} Animated value
 */

/**
 * @typedef {object} animPart
 * @property {string} name
 * @property {animFunction} fn
 * @property {number} duration in ms, use a negative number for infinite
 */

/**
 * @typedef {object} animInstance
 * @property {animPart} data
 * @property {HTMLElement} target
 * @property {number} timeOrigin
 */

/**
 * Indexes an array with a default value if the index is out of bounds
 * @returns a[i] if in bounds and def if not
 */
export function safeIndex(a, i, def){
	return i < a.length && i >= 0 ? a[i] : def;
}

/**
 * Indexes a nested array by the indices given in i, probably works for objects too so i is allowed to have strings in it i guess
 * @param {Array} a 
 * @param {Array<number | string>} i 
 * @returns a[i[0]][i[1]][i[2]]...
 */
export function arrayIndex(a, i){
	let out = a;
	for (let x of i){
		out = out[x];
	}
	return out;
}

/**
 * Converts an array of RGB(A) 0..1 values to a CSS rgb() string
 * @param {number[]} a 
 * @returns 
 */
export function ColorArrayToCSS(a){
	return `rgb(${a[0]*255} ${a[1]*255} ${a[2]*255} / ${a[3] || 1})`
}

/**
 * Finds a root of the polynomial a[0]+a[1]*x+a[2]*x^2 ... using Newton's meth0d
 * @param {number[]} a 
 * @param {number} init Initial guess
 * @returns 
 */
export function solvePolynomial(a, init=0){
	var now = init;
	var last = init-1000;
	while (Math.abs(now-last) > 0.0000000001){
		last = now;
		now -= evaluatePolynoms(a, now) / evaluatePolynoms(derivativePolynoms(a), now);
	}
	return now;
}

/**
 * Finds the derivative of the polynomial a[0]+a[1]*x+a[2]*x^2 ...
 * @param {number[]} a 
 * @returns 
 */
export function derivativePolynoms(a){
	var b = a.map((x, y) => x * y);
	b.shift();
	return b;
}

/**
 * a[0]+a[1]*x+a[2]*x^2 ...
 * @param {number[]} a 
 * @param {number} x 
 * @returns 
 */
export function evaluatePolynoms(a, x){
	return a.reduce((h, y, z) => h + y*(x**z), 0)
}
/**
 * Gets numbers from a string. Simple! Bit it's bugged.
 * @param {string} s 
 * @returns 
 */
export function getNumbers(s){
	return s.match(/[\d.]+/g).map(x => Number(x));
}



export var anims = [];
export class Anim {
	/**
	 * @param {animPart[]} x 
	 */
	constructor(x){
		this.anims = x;
	}
}
export function blink(e, bcolor, tcolor, duration){

}

/**
 * later elements sort later, if this returns 0 then the arrays are equal
 * @param {number[]} a 
 * @param {number[]} b 
 */
export function lexicographicOrder(a, b){
	for (let i = 0; i < Math.min(a.length, b.length); i++){
		if (a[i] != b[i]){
			return a[i] - b[i];
		}
	}
	return a.length - b.length;
}
/**
 * returns a random index in a number array weighted by the numbers in the array
 * @param {number[]} a 
 */
export function fromDist(a){
	if (typeof a === "number") {return 0}
	var r = Math.random() * a.reduce((p,q) => p+q);
	var i = 0;
	var s = 0;
	while (i < a.length){
		if (s > r){break;}
		s += a[i];
		i++;
	}
	return i-1 //0-index
}
/**
 * n choose r from math, = n*(n-1)...(n-r+1) / r!
 * @param {number} n 
 * @param {number} r 
 */
export function ncr(n, r){
	var out = 1;
	for (let i = 0; i < r; i++){
		out *= (n-i)/(i+1);
	}
	return out;
}

/**
 * Returns an array of n! arrays, containing all permutations of (0...n-1) in an irrelevant order
 * @param {number} n 
 * @returns {number[][]}
 */
export function getPermutations(n){
	if (n == 0){
		return [[]];
	}
	var out = [];
	for (let i = 0; i < n; i++){
		out = out.concat(getPermutations(n-1).map(x => x.toSpliced(i, 0, n-1)));
	}
	return out;
}

/**
 * Sample a uniform distribution of permutations of (0...n-1)
 * @param {number} n 
 * @returns {number[]}
 */
export function randomPermutation(n){
	return randomChoose(n, n);
}

/**
 * 
 * @param {number} n 
 * @param {number} r 
 * @returns {number[][]}
 */
export function getChooses(n, r){
	var out = [[]];
	for (let i = 0; i < r; i++){
		out = getChoosesHelper(n, r, i, out);
	}
	return out;

}
function getChoosesHelper(n, r, k, list){
	var out = [];
	for (let c of list){
		for (let i = (k==0 ? 0 : c[k-1]+1); i < n-r+k+1; i++){
			out.push(c.concat(i));
		}
	}
	return out;
}

/**
 * chooses r numbers out of (0...n-1) uniformly, order is random
 * @param {number} n 
 * @param {number} r 
 * @returns {number[]}
 */
export function randomChoose(n, r){
	var out = [];
	var leftNumbers = Array(n).fill(0).map((x, i) => i);
	for (let i = 0; i < r; i++){
		out.push(leftNumbers.splice(Math.floor(Math.random()*(n-i)), 1)[0]);
	}
	return out;
}
/**
 * 
 * @param {any[]} a 
 * @param {number[]} i 
 * @returns 
 */
export function indexMap(a, i){
	return i.map((x) => a[x]);
}
/**
 * [0,...,n-1]
 * @param {number} n 
 * @returns {number[]}
 */
export function iota(n){
	return Array(n).fill(0).map((x, i) => i);
}

/**
 * Uniform integer from (a...b) or (0...a) with one argument
 * @param {number} a 
 * @param {number} b 
 * @returns {number}
 */
export function randInt(a, b=0){
	 return a + Math.floor((b-a+1)*Math.random());
}

/**
 * Uniform real from (a...b) or (0...a) with one argument
 * @param {number} a 
 * @param {number} b 
 * @returns {number}
 */
export function randRange(a, b=0){
	return a + (b-a)*Math.random();
}

/**
 * Checks if the array is repeating after a while
 * @param {Array} a 
 */
export function hasLoop(a){

}