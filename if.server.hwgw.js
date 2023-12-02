import HackableBaseServer from "./if.server.hackable";

export const CONSTANTS = {
  ServerBaseGrowthRate: 1.03, // Unadjusted Growth rate
  ServerMaxGrowthRate: 1.0035, // Maximum possible growth rate (max rate accounting for server security)
};

/**
 * This function calculates the number of threads needed to grow a server from one $amount to a higher $amount
 * (ie, how many threads to grow this server from $200 to $600 for example).
 * It protects the inputs (so putting in INFINITY for targetMoney will use moneyMax, putting in a negative for start will use 0, etc.)
 * @param server - Server being grown
 * @param targetMoney - How much you want the server grown TO (not by), for instance, to grow from 200 to 600, input 600
 * @param startMoney - How much you are growing the server from, for instance, to grow from 200 to 600, input 200
 * @param cores - Number of cores on the host performing grow
 * @returns Integer threads needed by a single ns.grow call to reach targetMoney from startMoney.
 */
export function numCycleForGrowthCorrected(
  server,
  targetMoney,
  startMoney,
  cores,
  person,
) {
  if (!server.serverGrowth) return Infinity;
  const moneyMax = server.moneyMax ?? 1;
  const hackDifficulty = server.hackDifficulty ?? 100;

  if (startMoney < 0) startMoney = 0; // servers "can't" have less than 0 dollars on them
  if (targetMoney > moneyMax) targetMoney = moneyMax; // can't grow a server to more than its moneyMax
  if (targetMoney <= startMoney) return 0; // no growth --> no threads

  // exponential base adjusted by security
  const adjGrowthRate = 1 + (CONSTANTS.ServerBaseGrowthRate - 1) / hackDifficulty;
  const exponentialBase = Math.min(adjGrowthRate, CONSTANTS.ServerMaxGrowthRate); // cap growth rate

  // total of all grow thread multipliers
  const serverGrowthPercentage = server.serverGrowth / 100.0;
  const coreMultiplier = 1 + (cores - 1) / 16;
  const threadMultiplier =
    serverGrowthPercentage * person.mults.hacking_grow * coreMultiplier * 1.0 /*getBitNodeMultipliers().ServerGrowthRate*/;

  /* To understand what is done below we need to do some math. I hope the explanation is clear enough.
   * First of, the names will be shortened for ease of manipulation:
   * n:= targetMoney (n for new), o:= startMoney (o for old), b:= exponentialBase, t:= threadMultiplier, c:= cycles/threads
   * c is what we are trying to compute.
   *
   * After growing, the money on a server is n = (o + c) * b^(c*t)
   * c appears in an exponent and outside it, this is usually solved using the productLog/lambert's W special function
   * this function will be noted W in the following
   * The idea behind lambert's W function is W(x)*exp(W(x)) = x, or in other words, solving for y, y*exp(y) = x, as a function of x
   * This function is provided in some advanced math library but we will compute it ourself here.
   *
   * Let's get back to solving the equation. It cannot be rewrote using W immediately because the base of the exponentiation is b
   * b^(c*t) = exp(ln(b)*c*t) (this is how a^b is defined on reals, it matches the definition on integers)
   * so n = (o + c) * exp(ln(b)*c*t) , W still cannot be used directly. We want to eliminate the other terms in 'o + c' and 'ln(b)*c*t'.
   *
   * A change of variable will do. The idea is to add an equation introducing a new variable (w here) in the form c = f(w) (for some f)
   * With this equation we will eliminate all references to c, then solve for w and plug the result in the new equation to get c.
   * The change of variable performed here should get rid of the unwanted terms mentioned above, c = w/(ln(b)*t) - o should help.
   * This change of variable is allowed because whatever the value of c is, there is a value of w such that this equation holds:
   * w = (c + o)*ln(b)*t  (see how we used the terms we wanted to eliminate in order to build this variable change)
   *
   * We get n = (o + w/(ln(b)*t) - o) * exp(ln(b)*(w/(ln(b)*t) - o)*t) [ = w/(ln(b)*t) * exp(w - ln(b)*o*t) ]
   * The change of variable exposed exp(w - o*ln(b)*t), we can rewrite that with exp(a - b) = exp(a)/exp(b) to isolate 'w*exp(w)'
   * n = w/(ln(b)*t) * exp(w)/exp(ln(b)*o*t) [ = w*exp(w) / (ln(b) * t * b^(o*t)) ]
   * Almost there, we just need to cancel the denominator on the right side of the equation:
   * n * ln(b) * t * b^(o*t) = w*exp(w), Thus w = W(n * ln(b) * t * b^(o*t))
   * Finally we invert the variable change: c = W(n * ln(b) * t * b^(o*t))/(ln(b)*t) - o
   *
   * There is still an issue left: b^(o*t) doesn't fit inside a double precision float
   * because the typical amount of money on servers is around 10^6~10^9
   * We need to get an approximation of W without computing the power when o is huge
   * Thankfully an approximation giving ~30% error uses log immediately so we will use
   * W(n * ln(b) * t * b^(o*t)) ~= log(n * ln(b) * t * b^(o*t)) = log(n * ln(b) * t) + log(exp(ln(b) * o * t))
   * = log(n * ln(b) * t) + ln(b) * o * t
   * (thanks to Drak for the grow formula, f4113nb34st and Wolfram Alpha for the rewrite, dwRchyngqxs for the explanation)
   */
  const x = threadMultiplier * Math.log(exponentialBase);
  const y = startMoney * x + Math.log(targetMoney * x);
  /* Code for the approximation of lambert's W function is adapted from
   * https://git.savannah.gnu.org/cgit/gsl.git/tree/specfunc/lambert.c
   * using the articles [1] https://doi.org/10.1007/BF02124750 (algorithm above)
   * and [2] https://doi.org/10.1145/361952.361970 (initial approximation when x < 2.5)
   */
  let w;
  if (y < Math.log(2.5)) {
    /* exp(y) can be safely computed without overflow.
     * The relative error on the result is better when exp(y) < 2.5
     * using Padé rational fraction approximation [2](5)
     */
    const ey = Math.exp(y);
    w = (ey + (4 / 3) * ey * ey) / (1 + (7 / 3) * ey + (5 / 6) * ey * ey);
  } else {
    /* obtain initial approximation from rough asymptotic [1](4.18)
     * w = y [- log y when 0 <= y]
     */
    w = y;
    if (y > 0) w -= Math.log(y);
  }
  let cycles = w / x - startMoney;

  /* Iterative refinement, the goal is to correct c until |(o + c) * b^(c*t) - n| < 1
   * or the correction on the approximation is less than 1
   * The Newton-Raphson method will be used, this method is a classic to find roots of functions
   * (given f, find c such that f(c) = 0).
   *
   * The idea of this method is to take the horizontal position at which the horizontal axis
   * intersects with of the tangent of the function's curve as the next approximation.
   * It is equivalent to treating the curve as a line (it is called a first order approximation)
   * If the current approximation is c then the new approximated value is c - f(c)/f'(c)
   * (where f' is the derivative of f).
   *
   * In our case f(c) = (o + c) * b^(c*t) - n, f'(c) = d((o + c) * b^(c*t) - n)/dc
   * = (ln(b)*t * (c + o) + 1) * b^(c*t)
   * And the update step is c[new] = c[old] - ((o + c) * b^(c*t) - n)/((ln(b)*t * (o + c) + 1) * b^(c*t))
   *
   * The main question to ask when using this method is "does it converges?"
   * (are the approximations getting better?), if it does then it does quickly.
   * DOES IT CONVERGES? In the present case it does. The reason why doesn't help explaining the algorithm.
   * If you are interested then check out the wikipedia page.
   */
  let bt = exponentialBase ** threadMultiplier;
  if (bt == Infinity) bt = 1e300;
  let corr = Infinity;
  // Two sided error because we do not want to get stuck if the error stays on the wrong side
  do {
    // c should be above 0 so Halley's method can't be used, we have to stick to Newton-Raphson
    let bct = bt ** cycles;
    if (bct == Infinity) bct = 1e300;
    const opc = startMoney + cycles;
    let diff = opc * bct - targetMoney;
    if (diff == Infinity) diff = 1e300;
    corr = diff / (opc * x + 1.0) / bct;
    cycles -= corr;
  } while (Math.abs(corr) >= 1);
  /* c is now within +/- 1 of the exact result.
   * We want the ceiling of the exact result, so the floor if the approximation is above,
   * the ceiling if the approximation is in the same unit as the exact result,
   * and the ceiling + 1 if the approximation is below.
   */
  const fca = Math.floor(cycles);
  if (targetMoney <= (startMoney + fca) * Math.pow(exponentialBase, fca * threadMultiplier)) {
    return fca;
  }
  const cca = Math.ceil(cycles);
  if (targetMoney <= (startMoney + cca) * Math.pow(exponentialBase, cca * threadMultiplier)) {
    return cca;
  }
  return cca + 1;
}

export default class HWGWBaseServer extends HackableBaseServer {
  constructor(ns, id) {
    super();
    this.ns = ns;
    this._id = id;
  }
  get isHWGWReady() { return (this.money.available == this.money.max && this.security.level == this.security.min) }
  get perfect_batch() {
    const home = new HackableBaseServer(this.ns, "home")
    const hackThreads = Math.floor(this.ns.hackAnalyzeThreads(this.id, this.money.max * this.calculate_hack_percent()));
    const growThreads = numCycleForGrowthCorrected(this.ns.getServer(this.id), this.money.max, this.money.max * (1 - this.calculate_hack_percent()), home.cores, this.ns.getPlayer());

    return {
      hk: hackThreads,
      gr: growThreads,
      wk1: Math.ceil(hackThreads / 25),
      wk2: Math.ceil(growThreads / 12.5),
    }
  }

  calculate_hack_percent() {
    return 0.1;
  }

  get hwgw_value() {
    // calculate $ per threadSecond
    let dollars = this.calculate_hack_percent() * this.money.max;
    let ram = this.perfect_batch.hk * 1.75 + this.perfect_batch.gr * 1.8 + this.perfect_batch.wk1 * 1.8 + this.perfect_batch.wk2 * 1.8;
    let seconds = this.ns.getHackTime(this.id) * 4.0
    return dollars / (ram * seconds)
  }

  async updateCache(repeat = true, kv = new Map()) {
    do {

      let getters = this.listGetters(this)
      for (let o of Object.keys(getters)) {
        if (!kv.has(getters[o])) {
          kv.set(getters[o], this[getters[o]])
        }
      }

      await super.updateCache(false, kv)
      if (repeat) {
        await this.ns.asleep((Math.random() * 10000) + 55000); // base server update rate is 60s. we'll call faster updates when we need them.
      }

    } while (repeat)
  }
}
