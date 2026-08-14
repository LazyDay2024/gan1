(function(){
  "use strict";

  /* ============================================================
     helpers: numbers / fractions / shuffling
  ============================================================ */
  function randInt(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randNonZero(min, max){ var v; do { v = randInt(min, max); } while (v === 0); return v; }
  function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr){
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function gcd(a, b){ a = Math.abs(a); b = Math.abs(b); while (b){ var t = b; b = a % b; a = t; } return a || 1; }
  function fracStr(n, d){
    if (d === 0) return "หาค่าไม่ได้";
    if (n === 0) return "0";
    if (d < 0){ n = -n; d = -d; }
    var g = gcd(n, d);
    n = n / g; d = d / g;
    return d === 1 ? String(n) : (n + "/" + d);
  }

  /* ============================================================
     helpers: polynomial display
  ============================================================ */
  function polyMul(a, b){
    var res = new Array(a.length + b.length - 1).fill(0);
    for (var i = 0; i < a.length; i++)
      for (var j = 0; j < b.length; j++)
        res[i + j] += a[i] * b[j];
    return res;
  }
  function polyFromRoots(roots){
    var poly = [1];
    roots.forEach(function(r){ poly = polyMul(poly, [1, -r]); });
    return poly;
  }
  function polyToStringFromHigh(coeffsHigh, deg, v){
    var parts = [];
    for (var i = 0; i < coeffsHigh.length; i++){
      var c = coeffsHigh[i], p = deg - i;
      if (c === 0) continue;
      parts.push([c, p]);
    }
    if (!parts.length) return "0";
    var out = "";
    parts.forEach(function(t, idx){
      var c = t[0], p = t[1], abs = Math.abs(c);
      var mag = p === 0 ? String(abs)
        : (abs === 1 ? "" : String(abs)) + "<i>" + v + "</i>" + (p > 1 ? "<sup>" + p + "</sup>" : "");
      out += idx === 0 ? ((c < 0 ? "−" : "") + mag) : ((c < 0 ? " − " : " + ") + mag);
    });
    return out;
  }
  function linFactorStr(r){
    return r >= 0 ? "(<i>x</i> − " + r + ")" : "(<i>x</i> + " + (-r) + ")";
  }
  function innerLinStr(a, b){
    var axStr;
    if (a === 1) axStr = "<i>x</i>";
    else if (a === -1) axStr = "−<i>x</i>";
    else if (a > 0) axStr = a + "<i>x</i>";
    else axStr = "−" + (-a) + "<i>x</i>";
    var bpart = b === 0 ? "" : (b > 0 ? " + " + b : " − " + (-b));
    return "(" + axStr + bpart + ")";
  }

  /* ============================================================
     helpers: signed-term composition (used by derivative builder)
  ============================================================ */
  function composeSignedTerms(list){
    var str = "";
    list.forEach(function(t, idx){
      str += idx === 0 ? ((t.sign < 0 ? "−" : "") + t.mag) : ((t.sign < 0 ? " − " : " + ") + t.mag);
    });
    return str || "0";
  }
  function composeFiltered(partsAll){
    var nz = partsAll.filter(function(p){ return p.mag !== "0"; });
    return composeSignedTerms(nz.length ? nz : [{ sign: 1, mag: "0" }]);
  }

  /* ============================================================
     elementary term model: x^n, sin x, cos x, e^x, ln x
  ============================================================ */
  function termParts(t){
    var a = t.a, sign = a < 0 ? -1 : 1, absA = Math.abs(a);
    switch (t.type){
      case "pow": {
        var n = t.n;
        if (n === 0) return { sign: sign, mag: String(absA) };
        var xpart = n === 1 ? "<i>x</i>" : "<i>x</i><sup>" + n + "</sup>";
        var num = absA === 1 ? "" : String(absA);
        return { sign: sign, mag: num + xpart };
      }
      case "sin": return { sign: sign, mag: (absA === 1 ? "" : String(absA)) + "sin <i>x</i>" };
      case "cos": return { sign: sign, mag: (absA === 1 ? "" : String(absA)) + "cos <i>x</i>" };
      case "exp": return { sign: sign, mag: (absA === 1 ? "" : String(absA)) + "e<sup><i>x</i></sup>" };
      case "ln":  return { sign: sign, mag: (absA === 1 ? "" : String(absA)) + "ln <i>x</i>" };
    }
  }
  function termDerivParts(t){
    var a = t.a;
    switch (t.type){
      case "pow": {
        var n = t.n;
        if (n === 0) return { sign: 1, mag: "0" };
        var coeff = a * n, n2 = n - 1, sign = coeff < 0 ? -1 : 1, absC = Math.abs(coeff);
        var xpart = n2 === 0 ? "" : (n2 === 1 ? "<i>x</i>" : "<i>x</i><sup>" + n2 + "</sup>");
        var mag = n2 === 0 ? String(absC) : ((absC === 1 ? "" : String(absC)) + xpart);
        return { sign: sign, mag: mag };
      }
      case "sin": return { sign: a < 0 ? -1 : 1, mag: (Math.abs(a) === 1 ? "" : String(Math.abs(a))) + "cos <i>x</i>" };
      case "cos": return { sign: a < 0 ? 1 : -1, mag: (Math.abs(a) === 1 ? "" : String(Math.abs(a))) + "sin <i>x</i>" };
      case "exp": return { sign: a < 0 ? -1 : 1, mag: (Math.abs(a) === 1 ? "" : String(Math.abs(a))) + "e<sup><i>x</i></sup>" };
      case "ln":  return { sign: a < 0 ? -1 : 1, mag: String(Math.abs(a)) + "/<i>x</i>" };
    }
  }
  function mutateDerivPart(t){
    var a = t.a;
    switch (t.type){
      case "pow": {
        var n = t.n;
        if (n === 0) return { sign: 1, mag: String(Math.abs(a)) }; // forgot constant -> 0
        var kind = randInt(0, 2);
        if (kind === 0){ // forgot to multiply by n
          var n2 = n - 1, sign = a < 0 ? -1 : 1;
          var xpart = n2 === 0 ? "" : (n2 === 1 ? "<i>x</i>" : "<i>x</i><sup>" + n2 + "</sup>");
          var mag = n2 === 0 ? String(Math.abs(a)) : ((Math.abs(a) === 1 ? "" : String(Math.abs(a))) + xpart);
          return { sign: sign, mag: mag };
        } else if (kind === 1){ // forgot to drop exponent by one
          var coeff = a * n, sign2 = coeff < 0 ? -1 : 1;
          var xpart2 = n === 1 ? "<i>x</i>" : "<i>x</i><sup>" + n + "</sup>";
          return { sign: sign2, mag: (Math.abs(coeff) === 1 ? "" : String(Math.abs(coeff))) + xpart2 };
        } else { // sign flip
          var real = termDerivParts(t);
          return { sign: -real.sign, mag: real.mag };
        }
      }
      case "sin": {
        var k = randInt(0, 2);
        if (k === 0) return { sign: a < 0 ? -1 : 1, mag: (Math.abs(a) === 1 ? "" : String(Math.abs(a))) + "sin <i>x</i>" };
        if (k === 1) return { sign: 1, mag: "cos <i>x</i>" };
        return { sign: a < 0 ? 1 : -1, mag: (Math.abs(a) === 1 ? "" : String(Math.abs(a))) + "cos <i>x</i>" };
      }
      case "cos": {
        var k2 = randInt(0, 2);
        if (k2 === 0) return { sign: a < 0 ? -1 : 1, mag: (Math.abs(a) === 1 ? "" : String(Math.abs(a))) + "cos <i>x</i>" };
        if (k2 === 1) return { sign: 1, mag: "sin <i>x</i>" };
        return { sign: a < 0 ? -1 : 1, mag: (Math.abs(a) === 1 ? "" : String(Math.abs(a))) + "sin <i>x</i>" };
      }
      case "exp": {
        var k3 = randInt(0, 1);
        if (k3 === 0) return { sign: 1, mag: "e<sup><i>x</i></sup>" };
        return { sign: a < 0 ? -1 : 1, mag: (Math.abs(a) === 1 ? "" : String(Math.abs(a))) + "<i>x</i>e<sup><i>x</i></sup>" };
      }
      case "ln": {
        var k4 = randInt(0, 1);
        if (k4 === 0) return { sign: a < 0 ? -1 : 1, mag: "1/<i>x</i>" };
        return { sign: a < 0 ? -1 : 1, mag: String(Math.abs(a)) + "/<i>x</i><sup>2</sup>" };
      }
    }
  }

  /* ============================================================
     question generators — every number below is freshly randomized
  ============================================================ */

  // A: lim x→a of a polynomial (direct substitution)
  function genA(diff){
    var deg = diff === 1 ? 1 : (diff === 2 ? 2 : 3);
    var cRange = diff === 1 ? 6 : (diff === 2 ? 7 : 6);
    var aRange = diff === 1 ? 6 : (diff === 2 ? 5 : 4);
    var coeffs = [];
    for (var i = deg; i >= 0; i--) coeffs.push(i === deg ? randNonZero(-cRange, cRange) : randInt(-cRange, cRange));
    var a = randNonZero(-aRange, aRange);
    var val = 0, valNegA = 0;
    for (var k = 0; k < coeffs.length; k++){
      var p = deg - k;
      val += coeffs[k] * Math.pow(a, p);
      valNegA += coeffs[k] * Math.pow(-a, p);
    }
    var polyStr = polyToStringFromHigh(coeffs, deg, "x");
    var q = "lim<sub>x→" + a + "</sub> (" + polyStr + ") = ?";
    var wrongStrs = [String(valNegA), String(val - coeffs[coeffs.length - 1]), String(val + randNonZero(-5, 5)), String(val + randNonZero(-9, 9))];
    return { q: q, note: "แทน x=" + a + " ตรงๆ ลงในพหุนามได้ค่า <b>" + val + "</b>", correctStr: String(val), wrongStrs: wrongStrs };
  }

  // B: lim x→r of a 0/0 factorable rational expression
  function genB(diff){
    var range = diff === 1 ? 6 : (diff === 2 ? 8 : 7);
    var r1 = randInt(-range, range);
    var count = diff === 3 ? 2 : 1;
    var others = [];
    while (others.length < count){
      var s = randInt(-range, range);
      if (s !== r1 && others.indexOf(s) === -1) others.push(s);
    }
    var deg = 1 + count;
    var numCoeffs = polyFromRoots([r1].concat(others));
    var numStr = polyToStringFromHigh(numCoeffs, deg, "x");
    var denStr = linFactorStr(r1);
    var q = "lim<sub>x→" + r1 + "</sub> [" + numStr + "] / " + denStr + " = ?";
    var correctVal = 1;
    others.forEach(function(s){ correctVal *= (r1 - s); });
    var wrongStrs = ["0", String(-correctVal)];
    wrongStrs.push(others.length > 1 ? String(r1 - others[0]) : String(r1 + others[0]));
    wrongStrs.push(String(correctVal + randNonZero(-4, 4)));
    var note = "ตัวเศษแยกตัวประกอบได้ราก x=" + [r1].concat(others).join(", ") + " ตัด " + denStr + " ทิ้ง เหลือแทนค่า x=" + r1 + " ในตัวประกอบที่เหลือ ได้ <b>" + correctVal + "</b>";
    return { q: q, note: note, correctStr: String(correctVal), wrongStrs: wrongStrs };
  }

  // C: lim x→∞ of a rational function
  function genC(diff){
    var range = diff === 1 ? 6 : (diff === 2 ? 7 : 8);
    var du, dd;
    if (diff === 1){ du = 1; dd = 1; }
    else if (diff === 2){ var same = Math.random() < 0.6; du = same ? 2 : randInt(1, 2); dd = same ? 2 : (du === 1 ? 2 : 1); }
    else { var chosen = pick([[1, 1], [2, 2], [1, 2], [2, 1]]); du = chosen[0]; dd = chosen[1]; }
    function buildSide(deg){
      var lead = randNonZero(-range, range);
      var coeffs = [lead];
      for (var p = deg - 1; p >= 0; p--) coeffs.push(randInt(-range, range));
      return coeffs;
    }
    var numCoeffs = buildSide(du), denCoeffs = buildSide(dd);
    var numLead = numCoeffs[0], denLead = denCoeffs[0];
    var numStr = polyToStringFromHigh(numCoeffs, du, "x"), denStr = polyToStringFromHigh(denCoeffs, dd, "x");
    var q = "lim<sub>x→∞</sub> (" + numStr + ") / (" + denStr + ") = ?";
    var correctStr, note, wrongStrs = [];
    if (du === dd){
      correctStr = fracStr(numLead, denLead);
      note = "ดีกรีเศษเท่ากับส่วน → ลิมิต = อัตราส่วนสัมประสิทธิ์นำหน้า = " + numLead + "/" + denLead + " = <b>" + correctStr + "</b>";
      wrongStrs = ["0", "∞", fracStr(denLead, numLead), fracStr(-numLead, denLead)];
    } else if (du < dd){
      correctStr = "0";
      note = "ดีกรีตัวส่วนสูงกว่าตัวเศษ → ลิมิตเข้าใกล้ <b>0</b>";
      wrongStrs = [fracStr(numLead, denLead), "∞", fracStr(denLead, numLead)];
    } else {
      var sign = (numLead / denLead) >= 0 ? "∞" : "−∞";
      correctStr = sign;
      note = "ดีกรีตัวเศษสูงกว่าตัวส่วน → ลิมิตลู่ออกเป็น <b>" + sign + "</b>";
      wrongStrs = ["0", sign === "∞" ? "−∞" : "∞", fracStr(numLead, denLead)];
    }
    wrongStrs.push(fracStr(numLead + randNonZero(-3, 3), denLead));
    return { q: q, note: note, correctStr: correctStr, wrongStrs: wrongStrs };
  }

  // D: special limit sin(kx)/(mx) as x→0
  function genD(diff){
    var range = 6;
    var k = randNonZero(1, range);
    var mode = diff === 1 ? "overX" : (diff === 2 ? "overMX" : "overSin");
    var m = mode === "overX" ? 1 : randNonZero(1, range);
    var q, note, correctStr, wrongStrs;
    if (mode === "overX"){
      q = "lim<sub>x→0</sub> sin(" + (k === 1 ? "" : k) + "<i>x</i>) / <i>x</i> = ?";
      correctStr = String(k);
      note = "คูณ/หาร " + k + " ชดเชย: " + k + "·[sin(" + k + "x)/(" + k + "x)] → " + k + "·1 = <b>" + k + "</b>";
      wrongStrs = [String(k + randNonZero(-2, 2)), "0", "∞", fracStr(1, k)];
    } else if (mode === "overMX"){
      q = "lim<sub>x→0</sub> sin(" + (k === 1 ? "" : k) + "<i>x</i>) / (" + (m === 1 ? "" : m) + "<i>x</i>) = ?";
      correctStr = fracStr(k, m);
      note = "ดึงตัวคูณออกให้อยู่ในรูป sinθ/θ → ลิมิต = " + k + "/" + m + " = <b>" + correctStr + "</b>";
      wrongStrs = [String(k * m), fracStr(m, k), String(k + m)];
    } else {
      q = "lim<sub>x→0</sub> sin(" + (k === 1 ? "" : k) + "<i>x</i>) / sin(" + (m === 1 ? "" : m) + "<i>x</i>) = ?";
      correctStr = fracStr(k, m);
      note = "หารเศษและส่วนด้วย x แล้วใช้ sinθ/θ→1 ทั้งคู่ → เหลือ k/m = " + k + "/" + m + " = <b>" + correctStr + "</b>";
      wrongStrs = [String(k * m), fracStr(m, k), String(k + m)];
    }
    return { q: q, note: note, correctStr: correctStr, wrongStrs: wrongStrs };
  }

  // E: continuity check
  function genE(diff){
    var range = diff === 1 ? 6 : (diff === 2 ? 7 : 8);
    var subtypePool = diff === 1 ? ["poly", "rational"] : ["poly", "rational", "removable"];
    var subtype = pick(subtypePool);
    var r = randInt(-range, range);
    var askAtSame = Math.random() < 0.5;
    var a = askAtSame ? r : (function(){ var v; do { v = randInt(-range, range); } while (v === r); return v; })();
    var correctStr, q, note;
    if (subtype === "poly"){
      var c2 = randNonZero(-5, 5), c1 = randInt(-5, 5), c0 = randInt(-5, 5);
      var fStr = polyToStringFromHigh([c2, c1, c0], 2, "x");
      q = "f(<i>x</i>) = " + fStr + " ต่อเนื่องที่ x=" + a + " หรือไม่?";
      correctStr = "ต่อเนื่อง";
      note = "ฟังก์ชันพหุนามต่อเนื่องทุกจุดเสมอ ไม่ว่า x จะเป็นค่าใด";
    } else if (subtype === "rational"){
      q = "f(<i>x</i>) = 1 / " + linFactorStr(r) + " ต่อเนื่องที่ x=" + a + " หรือไม่?";
      correctStr = a === r ? "ไม่ต่อเนื่อง" : "ต่อเนื่อง";
      note = a === r
        ? "ที่ x=" + r + " ตัวส่วนเป็น 0 ทำให้ f(" + r + ") หาค่าไม่ได้ → ไม่ต่อเนื่อง"
        : "x=" + a + " ไม่ทำให้ตัวส่วนเป็นศูนย์ ฟังก์ชันนิยามได้และต่อเนื่อง";
    } else {
      var s2 = (function(){ var v; do { v = randInt(-range, range); } while (v === r); return v; })();
      var numStr2 = polyToStringFromHigh(polyFromRoots([r, s2]), 2, "x");
      q = "f(<i>x</i>) = [" + numStr2 + "] / " + linFactorStr(r) + " (นิยามเฉพาะ x≠" + r + ") ต่อเนื่องที่ x=" + a + " หรือไม่?";
      correctStr = a === r ? "ไม่ต่อเนื่อง" : "ต่อเนื่อง";
      note = a === r
        ? "แม้ลิมิตที่ x=" + r + " จะหาค่าได้ (=" + (r - s2) + ") แต่ f(" + r + ") ไม่ถูกนิยาม → ไม่ต่อเนื่อง"
        : "x=" + a + " อยู่ในโดเมนของฟังก์ชัน จึงต่อเนื่องที่จุดนี้";
    }
    var wrongStrs = ["ต่อเนื่อง", "ไม่ต่อเนื่อง", "บอกไม่ได้ เพราะข้อมูลไม่พอ", "ต่อเนื่องเฉพาะด้านเดียว"].filter(function(s){ return s !== correctStr; });
    return { q: q, note: note, correctStr: correctStr, wrongStrs: wrongStrs };
  }

  // F: basic derivative rules (1–3 elementary terms summed)
  function genF(diff){
    var nTerms = diff === 1 ? 1 : (diff === 2 ? 2 : 3);
    var coeffRange = diff === 1 ? 1 : 6;
    var powMax = diff === 1 ? 4 : (diff === 2 ? 5 : 6);
    var typesPool = ["pow", "sin", "cos", "exp", "ln"];
    var terms = [];
    for (var i = 0; i < nTerms; i++){
      var type = pick(typesPool);
      if (type === "pow"){
        var n = diff === 1 ? pick([0, 2, 3, 4]) : randInt(0, powMax);
        var a = coeffRange === 1 ? pick([1, -1]) : randNonZero(-coeffRange, coeffRange);
        terms.push({ type: "pow", a: a, n: n });
      } else {
        var a2 = coeffRange === 1 ? pick([1, -1]) : randNonZero(-coeffRange, coeffRange);
        terms.push({ type: type, a: a2 });
      }
    }
    var origParts = terms.map(termParts);
    var derivPartsAll = terms.map(termDerivParts);
    var qExpr = composeSignedTerms(origParts);
    var correctStr = composeFiltered(derivPartsAll);
    var q = "f(<i>x</i>) = " + qExpr + " &nbsp;→&nbsp; f'(<i>x</i>) = ?";

    var wrongStrs = [], attempts = 0;
    while (wrongStrs.length < 3 && attempts < 15){
      attempts++;
      var idx = randInt(0, terms.length - 1);
      var mutated = derivPartsAll.slice();
      mutated[idx] = mutateDerivPart(terms[idx]);
      var candidate = composeFiltered(mutated);
      if (candidate !== correctStr && wrongStrs.indexOf(candidate) === -1) wrongStrs.push(candidate);
    }
    while (wrongStrs.length < 3) wrongStrs.push(correctStr + "&nbsp;");

    var note = "หาอนุพันธ์ทีละเทอมด้วยสูตรพื้นฐาน แล้วรวมเครื่องหมายตามเดิม ได้ f'(x) = <b>" + correctStr + "</b>";
    return { q: q, note: note, correctStr: correctStr, wrongStrs: wrongStrs };
  }

  // H: chain rule
  function genH(diff){
    var range = diff === 1 ? 3 : (diff === 2 ? 5 : 6);
    var a = diff === 1 ? randNonZero(1, 3) : randNonZero(-range, range);
    var b = randInt(-range, range);
    var inner = innerLinStr(a, b);
    var type = pick(["pow", "sin", "cos", "exp", "ln"]);
    var q, correctStr, note, wrongCands;

    if (type === "pow"){
      var n = diff === 1 ? randInt(2, 3) : randInt(2, diff === 2 ? 5 : 6);
      var coeff = n * a, n2 = n - 1;
      correctStr = (coeff < 0 ? "−" : "") + (Math.abs(coeff) === 1 ? "" : Math.abs(coeff)) + inner + "<sup>" + n2 + "</sup>";
      q = "y = " + inner + "<sup>" + n + "</sup> &nbsp;→&nbsp; y' = ?";
      note = "กฎลูกโซ่: n(ข้างใน)ⁿ⁻¹·อนุพันธ์ข้างใน = " + n + "·" + inner + "<sup>" + n2 + "</sup>·(" + a + ") = <b>" + correctStr + "</b>";
      var coeff3 = (n - 1) * a;
      wrongCands = [
        String(n) + inner + "<sup>" + n2 + "</sup>",
        (coeff < 0 ? "−" : "") + (Math.abs(coeff) === 1 ? "" : Math.abs(coeff)) + inner + "<sup>" + n + "</sup>",
        (coeff3 < 0 ? "−" : "") + (Math.abs(coeff3) === 1 ? "" : Math.abs(coeff3)) + inner + "<sup>" + n2 + "</sup>"
      ];
    } else if (type === "sin"){
      q = "y = sin" + inner + " &nbsp;→&nbsp; y' = ?";
      correctStr = (a < 0 ? "−" : "") + (Math.abs(a) === 1 ? "" : Math.abs(a)) + "cos" + inner;
      note = "กฎลูกโซ่: cos(ข้างใน)·อนุพันธ์ข้างใน = cos" + inner + "·(" + a + ") = <b>" + correctStr + "</b>";
      wrongCands = [
        "cos" + inner,
        (a < 0 ? "−" : "") + (Math.abs(a) === 1 ? "" : Math.abs(a)) + "sin" + inner,
        (a < 0 ? "" : "−") + (Math.abs(a) === 1 ? "" : Math.abs(a)) + "cos" + inner
      ];
    } else if (type === "cos"){
      var coeff2 = -a;
      q = "y = cos" + inner + " &nbsp;→&nbsp; y' = ?";
      correctStr = (coeff2 < 0 ? "−" : "") + (Math.abs(coeff2) === 1 ? "" : Math.abs(coeff2)) + "sin" + inner;
      note = "กฎลูกโซ่: −sin(ข้างใน)·อนุพันธ์ข้างใน = −sin" + inner + "·(" + a + ") = <b>" + correctStr + "</b>";
      wrongCands = [
        (a < 0 ? "−" : "") + (Math.abs(a) === 1 ? "" : Math.abs(a)) + "sin" + inner,
        "−sin" + inner,
        (coeff2 < 0 ? "" : "−") + (Math.abs(coeff2) === 1 ? "" : Math.abs(coeff2)) + "cos" + inner
      ];
    } else if (type === "exp"){
      q = "y = e<sup>" + inner + "</sup> &nbsp;→&nbsp; y' = ?";
      correctStr = (a < 0 ? "−" : "") + (Math.abs(a) === 1 ? "" : Math.abs(a)) + "e<sup>" + inner + "</sup>";
      note = "กฎลูกโซ่: e^(ข้างใน)·อนุพันธ์ข้างใน = e^" + inner + "·(" + a + ") = <b>" + correctStr + "</b>";
      wrongCands = [
        "e<sup>" + inner + "</sup>",
        (a < 0 ? "−" : "") + (Math.abs(a) === 1 ? "" : Math.abs(a)) + "<i>x</i>e<sup>" + inner + "</sup>",
        (a < 0 ? "" : "−") + (Math.abs(a) === 1 ? "" : Math.abs(a)) + "e<sup>" + inner + "</sup>"
      ];
    } else {
      q = "y = ln" + inner + " &nbsp;→&nbsp; y' = ?";
      correctStr = fracStr(a, 1) + "/" + inner;
      note = "กฎลูกโซ่: (1/ข้างใน)·อนุพันธ์ข้างใน = " + a + "/" + inner + " = <b>" + correctStr + "</b>";
      wrongCands = ["1/" + inner, a + "/<i>x</i>", "1/<i>x</i>"];
    }
    return { q: q, note: note, correctStr: correctStr, wrongStrs: wrongCands };
  }

  // I: applications — tangent slope / increasing interval
  function genI(diff){
    var range = diff === 1 ? 5 : (diff === 2 ? 6 : 7);
    var subtype = pick(["slope", "interval"]);
    var c2 = randNonZero(-range, range);
    var c1 = randInt(-range, range);
    var c0 = randInt(-range, range);

    if (subtype === "slope"){
      var fStr = polyToStringFromHigh([c2, c1, c0], 2, "x");
      var a = randInt(-4, 4);
      var slope = 2 * c2 * a + c1;
      var q = "f(<i>x</i>) = " + fStr + " ความชันเส้นสัมผัสกราฟที่ x=" + a + " เท่ากับ?";
      var note = "f'(x) = " + (2 * c2) + "x" + (c1 >= 0 ? " + " + c1 : " − " + (-c1)) + " แทน x=" + a + " ได้ <b>" + slope + "</b>";
      var wrongStrs = [String(-slope), String(slope + randNonZero(-4, 4)), String(c1)];
      return { q: q, note: note, correctStr: String(slope), wrongStrs: wrongStrs };
    } else {
      var x0 = randInt(-4, 4);
      c1 = -2 * c2 * x0; // guarantee a clean integer critical point
      var fStr2 = polyToStringFromHigh([c2, c1, c0], 2, "x");
      var dir = c2 > 0;
      var q2 = "f(<i>x</i>) = " + fStr2 + " ฟังก์ชันเพิ่มขึ้นเมื่อใด?";
      var correctStr2 = (dir ? "x > " : "x < ") + x0;
      var note2 = "f'(x)=0 → x=" + x0 + " เพราะสัมประสิทธิ์ x² เป็น" + (c2 > 0 ? "บวก (กราฟหงาย)" : "ลบ (กราฟคว่ำ)") + " → เพิ่มขึ้นเมื่อ <b>" + correctStr2 + "</b>";
      var wrongStrs2 = [(dir ? "x < " : "x > ") + x0, "x > " + (x0 + 2), "x < " + (x0 - 2)];
      return { q: q2, note: note2, correctStr: correctStr2, wrongStrs: wrongStrs2 };
    }
  }

  var GENERATORS = { A: genA, B: genB, C: genC, D: genD, E: genE, F: genF, H: genH, I: genI };
  var CAT_NAME = {
    A: "แทนค่าตรง", B: "แยกตัวประกอบ", C: "ลิมิตที่อนันต์", D: "sin x ⁄ x",
    E: "ความต่อเนื่อง", F: "สูตรอนุพันธ์", H: "กฎลูกโซ่", I: "ประยุกต์"
  };
  var DIFF_NAME = { 1: "ง่าย", 2: "ปานกลาง", 3: "ยาก" };

  function buildQuestion(cat, gen, diff){
    for (var attempt = 0; attempt < 10; attempt++){
      var r = gen(diff);
      if (!r) continue;
      var opts = [r.correctStr];
      r.wrongStrs.forEach(function(w){ if (opts.indexOf(w) === -1) opts.push(w); });
      if (opts.length >= 4){
        opts = opts.slice(0, 4);
        var order = shuffle([0, 1, 2, 3]);
        var choices = order.map(function(i){ return opts[i]; });
        var correct = order.indexOf(0);
        return { cat: cat, q: r.q, note: r.note, choices: choices, correct: correct };
      }
    }
    return null;
  }

  function buildCategoryQueue(n){
    var cats = Object.keys(GENERATORS);
    var queue = [];
    while (queue.length < n) queue = queue.concat(shuffle(cats));
    return queue.slice(0, n);
  }

  /* ============================================================
     game state & UI wiring
  ============================================================ */
  var ROUND_SIZE = 15;
  var TIME_LIMIT = 30;
  var selectedDifficulty = 2;

  var els = {
    start: document.getElementById("screen-start"),
    game: document.getElementById("screen-game"),
    end: document.getElementById("screen-end"),
    btnStart: document.getElementById("btnStart"),
    btnNext: document.getElementById("btnNext"),
    btnReplay: document.getElementById("btnReplay"),
    tagCloud: document.getElementById("tagCloud"),
    diffOptions: document.getElementById("diffOptions"),
    hudProgress: document.getElementById("hudProgress"),
    hudScore: document.getElementById("hudScore"),
    hudStreak: document.getElementById("hudStreak"),
    hudTimer: document.getElementById("hudTimer"),
    timerFill: document.getElementById("timerFill"),
    catEyebrow: document.getElementById("catEyebrow"),
    questionText: document.getElementById("questionText"),
    choicesBox: document.getElementById("choicesBox"),
    noteBox: document.getElementById("noteBox"),
    gradeLetter: document.getElementById("gradeLetter"),
    gradeTitle: document.getElementById("gradeTitle"),
    gradeSub: document.getElementById("gradeSub"),
    endScore: document.getElementById("endScore"),
    endAccuracy: document.getElementById("endAccuracy"),
    endStreak: document.getElementById("endStreak"),
    reviewList: document.getElementById("reviewList")
  };

  Object.keys(CAT_NAME).forEach(function(k){
    var t = document.createElement("span");
    t.className = "tag";
    t.textContent = CAT_NAME[k];
    els.tagCloud.appendChild(t);
  });

  els.diffOptions.querySelectorAll(".diff-btn").forEach(function(btn){
    btn.addEventListener("click", function(){
      els.diffOptions.querySelectorAll(".diff-btn").forEach(function(b){ b.classList.remove("active"); });
      btn.classList.add("active");
      selectedDifficulty = parseInt(btn.getAttribute("data-diff"), 10);
    });
  });

  var state = null;

  function newRound(){
    var diff = selectedDifficulty;
    var queue = buildCategoryQueue(ROUND_SIZE);
    var questions = queue.map(function(cat){
      return buildQuestion(cat, GENERATORS[cat], diff) || buildQuestion(cat, GENERATORS[cat], diff);
    });
    state = {
      questions: questions, idx: 0, score: 0, streak: 0, bestStreak: 0, correctCount: 0,
      mistakes: [], timeLeft: TIME_LIMIT, timerHandle: null, lastTick: null, locked: false, difficulty: diff
    };
  }

  function show(screen){
    [els.start, els.game, els.end].forEach(function(s){ s.classList.add("hidden"); });
    screen.classList.remove("hidden");
  }

  function startGame(){
    newRound();
    show(els.game);
    renderQuestion();
  }

  function renderQuestion(){
    state.locked = false;
    var q = state.questions[state.idx];
    els.hudProgress.textContent = (state.idx + 1) + " / " + state.questions.length;
    els.hudScore.textContent = state.score;
    els.hudStreak.textContent = state.streak;
    els.catEyebrow.textContent = CAT_NAME[q.cat] + " · ระดับ" + DIFF_NAME[state.difficulty];
    els.questionText.innerHTML = q.q;
    els.noteBox.classList.remove("show");
    els.noteBox.innerHTML = "";
    els.btnNext.classList.remove("show");

    els.choicesBox.innerHTML = "";
    q.choices.forEach(function(choice, i){
      var btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.innerHTML = '<span class="choice-key">' + (i + 1) + '</span><span>' + choice + '</span>';
      btn.addEventListener("click", function(){ answer(i); });
      els.choicesBox.appendChild(btn);
    });

    state.timeLeft = TIME_LIMIT;
    updateTimerUI();
    state.lastTick = performance.now();
    if (state.timerHandle) cancelAnimationFrame(state.timerHandle);
    tickTimer();
  }

  function updateTimerUI(){
    els.hudTimer.textContent = Math.max(0, state.timeLeft).toFixed(1);
    var pct = Math.max(0, state.timeLeft / TIME_LIMIT) * 100;
    els.timerFill.style.width = pct + "%";
    if (state.timeLeft <= 4) els.timerFill.style.backgroundColor = "var(--coral)";
    else if (state.timeLeft <= 8) els.timerFill.style.backgroundColor = "var(--amber)";
    else els.timerFill.style.backgroundColor = "var(--cyan)";
  }

  function tickTimer(){
    var now = performance.now();
    var dt = (now - state.lastTick) / 1000;
    state.lastTick = now;
    if (!state.locked){
      state.timeLeft -= dt;
      if (state.timeLeft <= 0){
        state.timeLeft = 0;
        updateTimerUI();
        answer(-1);
        return;
      }
      updateTimerUI();
    }
    state.timerHandle = requestAnimationFrame(tickTimer);
  }

  function answer(choiceIdx){
    if (state.locked) return;
    state.locked = true;
    if (state.timerHandle) cancelAnimationFrame(state.timerHandle);

    var q = state.questions[state.idx];
    var isCorrect = (choiceIdx === q.correct);
    var buttons = els.choicesBox.querySelectorAll(".choice-btn");

    buttons.forEach(function(btn, i){
      btn.disabled = true;
      if (i === q.correct) btn.classList.add("correct");
      else if (i === choiceIdx) btn.classList.add("wrong");
      else btn.classList.add("dim");
    });

    if (isCorrect){
      var speedBonus = Math.round((state.timeLeft / TIME_LIMIT) * 60);
      var streakBonus = Math.min(state.streak * 8, 80);
      var points = 100 + speedBonus + streakBonus;
      state.score += points;
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      state.correctCount += 1;
      els.noteBox.innerHTML = "✓ ถูกต้อง +" + points + " แต้ม &nbsp;·&nbsp; " + q.note;
    } else {
      state.streak = 0;
      state.mistakes.push({ q: q.q, your: (choiceIdx === -1 ? "หมดเวลา" : q.choices[choiceIdx]), correct: q.choices[q.correct] });
      var label = choiceIdx === -1 ? "⏱ หมดเวลา" : "✕ ไม่ถูกต้อง";
      els.noteBox.innerHTML = label + " &nbsp;·&nbsp; " + q.note;
    }
    els.noteBox.classList.add("show");
    els.hudScore.textContent = state.score;
    els.hudStreak.textContent = state.streak;
    els.btnNext.classList.add("show");
    els.btnNext.focus();
  }

  function nextQuestion(){
    if (!state.locked) return;
    state.idx += 1;
    if (state.idx >= state.questions.length) finishRound();
    else renderQuestion();
  }

  function finishRound(){
    if (state.timerHandle) cancelAnimationFrame(state.timerHandle);
    var total = state.questions.length;
    var acc = state.correctCount / total;
    var pct = Math.round(acc * 100);

    var grade;
    if (acc >= 0.9) grade = ["S", "เทพลิมิต", "แม่นและไวมาก แทบไม่มีจุดอ่อน"];
    else if (acc >= 0.75) grade = ["A", "โปรตัวจริง", "พื้นฐานแน่น ทำต่อไปแบบนี้"];
    else if (acc >= 0.6) grade = ["B", "ผ่านฉลุย", "โอเคแล้ว ฝึกอีกนิดจะแม่นขึ้น"];
    else if (acc >= 0.4) grade = ["C", "ต้องฝึกอีกหน่อย", "ทบทวนสูตรที่พลาดบ่อยแล้วลองใหม่"];
    else grade = ["D", "กลับไปอ่านสูตรก่อน", "ลองลดระดับความยากลงแล้วเริ่มจากพื้นฐาน"];

    els.gradeLetter.textContent = grade[0];
    els.gradeTitle.textContent = grade[1];
    els.gradeSub.textContent = "ตอบถูก " + state.correctCount + " / " + total + " ข้อ (ระดับ" + DIFF_NAME[state.difficulty] + ") — " + grade[2];
    els.endScore.textContent = state.score;
    els.endAccuracy.textContent = pct + "%";
    els.endStreak.textContent = state.bestStreak;

    els.reviewList.innerHTML = "";
    if (state.mistakes.length === 0){
      var empty = document.createElement("div");
      empty.className = "review-empty";
      empty.textContent = "ไม่มีข้อผิดเลย ทำได้เต็มรอบ 🎯";
      els.reviewList.appendChild(empty);
    } else {
      state.mistakes.forEach(function(m){
        var div = document.createElement("div");
        div.className = "review-item";
        div.innerHTML = '<div class="rq">' + m.q + '</div>' +
                         '<div class="ra">คุณตอบ: ' + m.your + ' &nbsp;·&nbsp; เฉลย: <b>' + m.correct + '</b></div>';
        els.reviewList.appendChild(div);
      });
    }

    show(els.end);
  }

  els.btnStart.addEventListener("click", startGame);
  els.btnNext.addEventListener("click", nextQuestion);
  els.btnReplay.addEventListener("click", startGame);

  document.addEventListener("keydown", function(e){
    if (!els.game.classList.contains("hidden")){
      if (["1", "2", "3", "4"].includes(e.key) && !state.locked){
        var i = parseInt(e.key, 10) - 1;
        if (i < els.choicesBox.children.length) answer(i);
      } else if (e.key === "Enter" && state.locked){
        nextQuestion();
      }
    } else if (!els.start.classList.contains("hidden") && e.key === "Enter"){
      startGame();
    } else if (!els.end.classList.contains("hidden") && e.key === "Enter"){
      startGame();
    }
  });

})();
