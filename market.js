// Built upon u/pwillia7 's stock script.
// u/ferrus_aub stock script using simple portfolio algorithm.
/** @param {NS} ns **/
export async function main(ns) {
  var maxSharePer = 1.00
  var stockBuyPer = 0.60
  var stockVolPer = 0.05
  var moneyKeep = 1000000000
  var minSharePer = 5
  var minPerTransaction = 500000000

  while (true) {
    ns.disableLog('disableLog');
    ns.disableLog('sleep');
    ns.disableLog('getServerMoneyAvailable');
    var stocks = ns.stock.getSymbols()
    for (const stock of stocks) {
      var position = ns.stock.getPosition(stock);
      if (position[0]) {
        //ns.print('Position: ' + stock + ', ')
        sellPositions(stock);
      }
      buyPositions(stock);
    }
    //ns.print('Cycle Complete');
    await ns.sleep(1000);
  }
  function buyPositions(stock) {
    var maxShares = (ns.stock.getMaxShares(stock) * maxSharePer) - position[0];
    var askPrice = ns.stock.getAskPrice(stock);
    var forecast = ns.stock.getForecast(stock);
    var volPer = ns.stock.getVolatility(stock);
    var playerMoney = ns.getServerMoneyAvailable('home');

    if (forecast >= stockBuyPer && volPer <= stockVolPer) {
      if (playerMoney - moneyKeep - minPerTransaction >= ns.stock.getPurchaseCost(stock, minSharePer, "Long")) {
        var shares = Math.min((playerMoney - moneyKeep - 100000) / askPrice, maxShares);
        ns.stock.buyStock(stock, shares);
        //ns.print('Bought: '+ stock + '')
      }
    }
  }
  function sellPositions(stock) {
    var forecast = ns.stock.getForecast(stock);
    if (forecast < 0.5) {
      ns.stock.sellStock(stock, position[0]);
      //ns.print('Sold: '+ stock + '')
    }
  }
}