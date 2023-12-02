// purchase-upgrade-servers.js
//const maxRam = 16;
//const maxRam = 128;
//const maxRam = 256;
const maxRam = 512;
//const maxRam = 1024;
//const maxRam = 2048;
//const maxRam = 8192;

export async function main(ns) {
  while (true) {
    const servers = ns.getPurchasedServers();

    if (servers.length < ns.getPurchasedServerLimit()) {
      if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(8)) {
        let hostname = ns.purchaseServer("pserv-" + servers.length, 8);
        ns.scp(["bin.wk.js", "bin.hk.js", "bin.gr.js"], hostname, "home");
      }
    } else {
      // find a server with the smallest ram
      let smallestRam = -1;
      for (let server of servers) {
        if (smallestRam == -1 || ns.getServerMaxRam(server) < smallestRam) {
          smallestRam = ns.getServerMaxRam(server);
        }
      }
      // stop upgrading if everything is at least maxRam GB
      if (smallestRam >= maxRam) {
        ns.tprint(`Stopped upgrading because all purchased servers have at least ${maxRam}GB of RAM.`)
        return;
      }

      for (let server of servers) {
        const currentRam = ns.getServerMaxRam(server);
        if (currentRam == smallestRam) {
          const newRam = currentRam * 2;

          if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(newRam)) {
            ns.tprint(`upgrading server ${server} from ${currentRam}GB to ${newRam}GB for \$${ns.getPurchasedServerCost(newRam)}`);
            ns.upgradePurchasedServer(server, newRam);
            break;
          }
        }
      }
    }
    //ns.tprint(`servers: ${servers.length} ${servers}`);
    await ns.sleep(100);
  }
}