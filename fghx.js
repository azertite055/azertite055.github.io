var u = -1; //uprank "function", same as a regular string but -1 is the parameter into which a string is substituted to return a new string
var d = -1; //downrank "function" ^^^^
var fflag = false; //found end flag
var xh = 0; //head of the expression
var invalue = 0;
//everything except reduce works on regularized values only (== c nonsuccessor)
function isS(x){ //is successor
    return x[0] == 0 && x[1] == 0 && x[2] == 0;
}
function isL(x){ //is limit
    return x != 0 && !isS(x);
}
function p(x){ //predecessor (only apply if you know the value is a successor
    if(!isS(x)){
        console.error("Non-succesor value passed to predecessor");
        return x;
    }
    return x[3]
}
function n(s){
    if (s==0){return 0}
    return [0,0,0,n(s-1)];
}
function informat(s){ //input formatting effectively
    if (Array.isArray(s)){
        return s.map(x => informat(x));
    }
    else {
        return n(s);
    }
}
function nInv(x){
    if(x==0){return 0}
    if (isS(x)){
        return 1 + nInv(p(x));
    }
    else {
        return -999999999; //if the string isn't numeric we return a negative number
    }
}
function r(x){ //reduce
    if(nInv(x) >= 0){ //preformance improver
        return x;
    }
    if(Array.isArray(x)){
        x[0] = r(x[0]);
        x[1] = r(x[1]);
        x[2] = r(x[2]);
        x[3] = r(x[3]);
    }
    if(x == 0){
        return 0;
    }
    //x = [a,b,c,d]
    if(isS(x)){
        return [x[0], x[1], x[2], r(x[3])];
    }
    if(isS(x[2])){
        x = [x[0], x[1], 0, [x[0], x[1], p(x[2]), x[3]]];
    }
    if(x[2] == 0 && isS(x[1])){
        x = [x[0], p(x[1]), x[3], x[3]];
    }
    if (x[0] == 0 && isL(x[1]) && x[2] == 0 && nInv(x[3])>=0){ // limit rule
        return [0, ls(x[1], nInv(x[3])), 0, x[3]];
    }
    return x;
}
function f(x){ //find head, assume regularized
    //console.log(x);
    if(isL(x[2])){
        u = [x[0], x[1], u, x[3]];
        return f(x[2]);
    }
    else if(isL(x[1])){
        u = [x[0], u, x[2], x[3]];
        return f(x[1]);
    }
    else if(isL(x[3])){
        u = [x[0], x[1], x[2], u];
        return f(x[3]);
    }
    else if(isL(x[0])){
        u = [u, x[1], x[2], x[3]];
        return f(x[0]);
    }
    else {
        fflag = true;
        return x;
    }
}
function i(x){ //initial part (b,c=0 and at least one of a,d successor)
    if(x[3] == 0){
        return [p(x[0]), x[1], x[2], x[3]];
    }
    else {
        return [x[0], x[1], x[2], p(x[3])];
    }
}
function ls(x, k){ //limit sequence (setup)
    u = -1;
    xh = structuredClone(x);
    fflag = false;
    while (!fflag){
        xh=f(xh); //sets u and xh simultaneously
    }
    d = [p(xh[0]), -1, 0, i(xh)];
    //console.log(u);
    //console.log(d);
    //console.log(xh);
    if (arrayeq(xh, [n(1), 0, 0, 0])){ //w rule
        return si(u, n(k));
    }
    else {
        return lsc(x, k); //collapse rule
    }
}
function lsc(x, k){
    if (k == 0){ //initial rule, x[0] = i(x)
        return si(u, i(xh));
    }
    return si(d, si(u, lsc(x, k-1))); //insert the rest
}
function si(rel, x){ //substitute into
    if (Array.isArray(rel)){
        return rel.map(i => si(i,x))
    }
    return rel == -1 ? x : rel;
}
function arrayeq(a, b){ //array equality (no longer in use)
    if (Array.isArray(a) && Array.isArray(b)){
        return (a.length == b.length) && a.reduce((x, y, n) => x && arrayeq(a[n], b[n]), true);
    }
    else if (!Array.isArray(a) && !Array.isArray(b)){
        return a==b;
    }
    else {
        return false;
    }
}
function outformat(x){ //output formatting
    if (nInv(x) >= 0){
        return nInv(x);
    }
    else{
        return x.map(t => outformat(t));
    }
}