export async function main(ns) {
  var maxSharePer = 1.00;
  var stockBuyOVer_Long = 0.60; // buy stocks when over this % 
  var stockBuyUnder_Short = 0.40; // buy shorts when under this % 
  var stockVolPer = 0.05; // stocks must be under this volatiyy
  var moneyKeep = 1000000000000;
  var minSharePer = 5;
  var sellThreshold_Long = 0.55; //sell when chance of increasing is under this
  var sellThreshold_Short = 0.40; //sell when chance of increasing is under this

  ns.disableLog('disableLog');
  ns.disableLog('sleep');
  ns.disableLog('getServerMoneyAvailable');
  ns.tail();

  while (true) {
    var OrderedStocks = ns.stock.getSymbols().sort(function (a, b) {
      return Math.abs(0.5 - ns.stock.getForecast(b)) - Math.abs(0.5 - ns.stock.getForecast(a));
    })

    var currentWorth = 0;
    for (const stock of OrderedStocks) {
      var position = ns.stock.getPosition(stock);
      if (position[0] > 0 || position[2] > 0) {
        SellIfOutsideThreshdold(stock);
      }
      buyPositions(stock);

      //track out current value over time...
      if (position[0] > 0 || position[2] > 0) {
        const longShares = position[0];
        const longPrice = position[1];
        const shortShares = position[2];
        const shortPrice = position[3];
        const bidPrice = ns.stock.getBidPrice(stock);

        let profit = longShares * (bidPrice - longPrice) - (2 * 100000);
        let profitShort = shortShares * Math.abs(bidPrice - shortPrice) - (2 * 100000);

        currentWorth += profitShort + profit + (longShares * longPrice) + (shortShares * shortPrice);
      }
    }
    ns.print('Cycle Complete - StockWorth = ' + ns.nFormat(currentWorth, '0,0') + ' :: Chash in hand = ' + ns.nFormat(ns.getServerMoneyAvailable('home'), '0,0'));
    await ns.sleep(2000);
  }

  function buyPositions(stock) {
    var maxShares = (ns.stock.getMaxShares(stock) * maxSharePer) - position[0];
    var maxSharesShort = (ns.stock.getMaxShares(stock) * maxSharePer) - position[2];
    var askPrice = ns.stock.getAskPrice(stock);
    var forecast = ns.stock.getForecast(stock);
    var volPer = ns.stock.getVolatility(stock);
    var playerMoney = ns.getServerMoneyAvailable('home');


    //long conditions
    if (forecast >= stockBuyOVer_Long && volPer <= stockVolPer) {
      if (playerMoney - moneyKeep > ns.stock.getPurchaseCost(stock, minSharePer, "Long")) {
        var shares = Math.min((playerMoney - moneyKeep - 100000) / askPrice, maxShares);
        ns.stock.buyStock(stock, shares);
        //ns.print('Bought: '+ stock + '')
      }
    }

    //Short conditions
    if (forecast <= stockBuyUnder_Short && volPer <= stockVolPer) {
      if (playerMoney - moneyKeep > ns.stock.getPurchaseCost(stock, minSharePer, "Short")) {
        var shares = Math.min((playerMoney - moneyKeep - 100000) / askPrice, maxSharesShort);
        ns.stock.buyShort(stock, shares);
        //ns.print('Bought: '+ stock + '')
      }
    }
  }

  function SellIfOutsideThreshdold(stock) {
    var position = ns.stock.getPosition(stock);
    var forecast = ns.stock.getForecast(stock);

    if (position[0] > 0) {
      ns.print(stock + ' -> Current Forecast: ' + forecast)
      if (forecast < sellThreshold_Long) {
        ns.stock.sellStock(stock, position[0]);
      }
    }
    if (position[2] > 0) {
      ns.print(stock + ' -> Current Forecast: ' + forecast)
      if (forecast > sellThreshold_Short) {
        ns.stock.sellShort(stock, position[2]);
      }
    }
  }

}