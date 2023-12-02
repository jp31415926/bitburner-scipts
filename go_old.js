/** go_old.js **/

export async function main(ns) {
  //const targets = ["n00dles"]; // 1.5M
  //const targets = ["foodnstuff"]; // 50M
  //const targets = ["joesguns"]; // 62M
  //const targets = ["max-hardware"]; // 250M
  //const targets = ["iron-gym"]; // 500M
  const targets = ["silver-helix"]; // $1.125b
  //const targets = ["summit-uni"]; // $8.41b
  //const targets = ["zb-institute"]; // $26.61b
  //const targets = ["global-pharm"]; // $43.24b

  //const targets = ["silver-helix", "joesguns"];
  //const targets = ["computek", "the-hub", "silver-helix"];

  const overheadPercentage = 1.5;

  let servers = dpList(ns);
  ns.disableLog("ALL");
  ns.tail();
  //ns.tprint(`Servers: ${servers}`);

  // copy all scripts to every server
  for (let server of servers) {
    await ns.scp(["bin.wk.js", "bin.hk.js", "bin.gr.js"], server, "home");
    if (server != "home") {
      await ns.killall(server, true);
    }
  }

  var hackThreads = [];
  var weakThreads = [];
  var growThreads = [];
  var wkgrThreads = [];
  for (let target of targets) {
    ns.exec("monitor.js", "home", 1, target);
    hackThreads[target] = -1;
    weakThreads[target] = -1;
    growThreads[target] = -1;
    wkgrThreads[target] = -1;
  }

  while (true) {
    for (let server of servers) {
      if (ns.hasRootAccess(server)) {
        for (let target of targets) {
          const moneyThresh = ns.getServerMaxMoney(target) * 0.85;
          const securityThresh = ns.getServerMinSecurityLevel(target) + 5;

          if (ns.hasRootAccess(target)) {
            // divert all of this server's available threads to the most valuable command
            /*
            if ((ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target) + 5) ||
              (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target) * 0.85)) {
              if (wkgrThreads[target] == -1) {
                const minSec = ns.getServerMinSecurityLevel(target);
                const sec = ns.getServerSecurityLevel(target);
                let money = ns.getServerMoneyAvailable(target);
                if (money === 0) money = 1;
                const maxMoney = ns.getServerMaxMoney(target);
                var threads = Math.ceil((ns.growthAnalyze(target, maxMoney / money) * (1.0 + overheadPercentage) +
                  (sec - minSec) * 20));
                ns.print(`   *** Running ${target}:${threads} weaken/grow threads`);
                wkgrThreads[target] = threads;
              }
              if (wkgrThreads[target] > 0) {
                var threadsRun = runScript(ns, server, "bin.wk.js", target, wkgrThreads[target]);
                wkgrThreads[target] -= threadsRun;
              }
              hackThreads[target] = -1;
              */
            if (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target) + 5) {
              runScript(ns, server, "bin.wk.js", target, weakThreads[target]);
              hackThreads[target] = -1;
            } else if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target) * 0.85) {
              runScript(ns, server, "bin.gr.js", target, growThreads[target]);
              hackThreads[target] = -1;
            } else {
              if (hackThreads[target] == -1) {
                let money = ns.getServerMoneyAvailable(target);
                if (money === 0) money = 1;
                var threads = Math.ceil(ns.hackAnalyzeThreads(target, money));
                ns.print(`   *** Running ${target}:${threads} hack threads`);
                hackThreads[target] = threads;
              }
              if (hackThreads[target] > 0) {
                var threadsRun = runScript(ns, server, "bin.hk.js", target, hackThreads[target]);
                hackThreads[target] -= threadsRun;
              }
            }
          }
        }
      } else {
        //ns.tprint(`Trying to hack ${server}`);
        // open all possible ports on every server; then attempt to nuke the server
        try {
          ns.brutessh(server);
          ns.ftpcrack(server);
          ns.relaysmtp(server);
          ns.httpworm(server);
          ns.sqlinject(server);
        } catch { }

        try {
          ns.nuke(server);
        } catch { }

      }
      await ns.sleep(1);// 5
    }
    // update server list in case we add more servers
    servers = dpList(ns);
  }
}

/**
 * returns an array of servers dynamically
 */
function dpList(ns, current = "home", set = new Set()) {
  let connections = ns.scan(current);
  let next = connections.filter(c => !set.has(c));
  next.forEach(n => {
    set.add(n);
    return dpList(ns, n, set);
  })
  return Array.from(set.keys());
}

function threadCount(ns, server, scriptRam) {
  let free_ram = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
  let threads = free_ram / scriptRam;
  return Math.floor(threads);
}

// run script on "server" machine that targets "target" machine
function runScript(ns, server, script_name, target, threadLimit = 0) {
  const weakenPercentage = 0.2;
  let available_threads = threadCount(ns, server, ns.getScriptRam(script_name));
  let maxThreads = Math.max(1, Math.ceil(ns.getServerMaxRam(server) / ns.getScriptRam(script_name) /* * 0.25 */)); // 25%
  if (server == "home") {
    available_threads -= 20;
    //maxThreads = 10; // 10
  }
  if (available_threads >= maxThreads) {
    available_threads = maxThreads;
  }
  if (threadLimit > 0 && available_threads >= threadLimit) {
    available_threads = threadLimit;
  }
  if (available_threads >= 1) {
    var script_to_exec;
    const weakFN = "bin.wk.js";
    const growFN = "bin.gr.js";
    if (available_threads < 2) {
      if ((script_name == growFN || script_name == weakFN)) {
        // 15% chance to weaken, 85% change to grow
        script_to_exec = (Math.random() > weakenPercentage) ? growFN : weakFN;
      } else {
        script_to_exec = script_name;
      }
      ns.print(`${server} => ${target}: ${script_to_exec} ${available_threads}`);
      ns.exec(script_to_exec, server, available_threads, target);
    } else {
      if ((script_name == growFN || script_name == weakFN)) {
        var weakenThreads = Math.ceil(available_threads * weakenPercentage);
        ns.print(`${server} => ${target}: ${weakFN} ${weakenThreads}`);
        ns.exec(weakFN, server, weakenThreads, target);
        if (available_threads - weakenThreads > 0) {
          ns.print(`${server} => ${target}: ${growFN} ${available_threads - weakenThreads}`);
          ns.exec(growFN, server, available_threads - weakenThreads, target);
        }
      } else {
        ns.print(`${server} => ${target}: ${script_name} ${available_threads}`);
        ns.exec(script_name, server, available_threads, target);
      }
    }
    return available_threads;
  }
  return 0;
}
