((window, d3) => {


    /* global d3 crossfilter reset */

    function filterBricks(bricks) {
        return bricks.filter(brick =>
            brick && brick.properties && brick.properties.data_portals2019 && brick.properties.data_portals2019._id
        )
    };

    function mapBricks(bricks, indicators) {
        let result = bricks.map((brick) => {
            let temp = {};
            temp['_id'] = brick._id;
            indicators.forEach((indicator) => {
                temp[indicator.key] = brick.properties.data_portals2019[indicator.grupo][indicator.key];
            });
            return temp;
        });
        return result;
    }
    d3.queue()
        .defer(d3.json, "./assets/data/bricks$.value.json?v=2000")
        .defer(d3.json, "./assets/data/activeIndicator$.value.json?v=2000")
        .defer(d3.json, "./assets/data/analyticsIndicators$.value.json?v=2000")
        .await((error, bricks, activeIndicator, analyticsIndicators) => {
            if (error) throw error;
            let filterDataPortals = filterBricks(bricks);
            let base = mapBricks(filterDataPortals, analyticsIndicators);
            let y;

        });

})(document, this.d3);