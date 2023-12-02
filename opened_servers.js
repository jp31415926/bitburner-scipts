// opened_servers.js

function scan(ns, parent, server, list) {
  const children = ns.scan(server);
  for (let child of children) {
    if (parent == child) {
      continue;
    }
    list.push(child);

    scan(ns, server, child, list);
  }
}

export function list_servers(ns) {
  const list = [];
  scan(ns, '', 'home', list);
  return list;
}

/** @param {NS} ns **/
export async function main(ns) {
  const args = ns.flags([["help", false]]);

  if (args.help) {
    ns.tprint("This script lists all servers on which you can run scripts.");
    ns.tprint(`Usage: run ${ns.getScriptName()}`);
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()}`);
    return;
  }

  ns.disableLog('ALL');
  ns.tail()

  const servers = list_servers(ns).filter(s => ns.hasRootAccess(s)).concat(['home']);
  for (const server of servers) {
    const usedRam = ns.getServerUsedRam(server);
    const maxRam = ns.getServerMaxRam(server);
    const maxMoney = (ns.getServerMaxMoney(server) / 1000000000.0).toFixed(3);
    const hackLevel = ns.getServerRequiredHackingLevel(server);
    //    ns.tprint(`${server}: ${usedRam}/${maxRam}GB (${(100 * usedRam / maxRam).toFixed(2)}%) \$${maxMoney}b`)
    ns.print(`${server},${usedRam},${maxRam}, \$${maxMoney}, ${hackLevel}`)
  }
}