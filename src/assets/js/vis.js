// https://bl.ocks.org/micahstubbs/66db7c01723983ff028584b6f304a54a

((window, d3) => {

    // vars
    let p1 = d3.json("./assets/data/bricks$.value.json?v=2000");
    let p2 = d3.json("./assets/data/activeIndicator$.value.json?v=2000");
    let p3 = d3.json("./assets/data/analyticsIndicators$.value.json?v=2000");
    let data = [];
    let chart;
    let crossAll;
    const formatNumber = d3.format(',d');

    // functions

    function barChart() {
        if (!barChart.id) barChart.id = 0;

        let margin = { top: 10, right: 13, bottom: 20, left: 10 };
        let x;
        let y = d3.scaleLinear().range([100, 0]);
        const id = barChart.id++;
        const axis = d3.axisBottom();
        const brush = d3.brushX();
        let brushDirty;
        let dimension;
        let group;
        let round;
        let gBrush;

        function chart(div) {
            const width = x.range()[1];
            const height = y.range()[0];

            brush.extent([[0, 0], [width, height]]);

            y.domain([0, group.top(1)[0].value]);

            div.each(function () {
                const div = d3.select(this);
                let g = div.select('g');

                // Create the skeletal chart.
                if (g.empty()) {
                    div.select('.title').append('a')
                        .attr('href', `javascript:reset(${id})`)
                        .attr('class', 'reset')
                        .text('reset')
                        .style('display', 'none');

                    g = div.append('svg')
                        .attr('width', width + margin.left + margin.right)
                        .attr('height', height + margin.top + margin.bottom)
                        .append('g')
                        .attr('transform', `translate(${margin.left},${margin.top})`);

                    g.append('clipPath')
                        .attr('id', `clip-${id}`)
                        .append('rect')
                        .attr('width', width)
                        .attr('height', height);

                    g.selectAll('.bar')
                        .data(['background', 'foreground'])
                        .enter().append('path')
                        .attr('class', d => `${d} bar`)
                        .datum(group.all());

                    g.selectAll('.foreground.bar')
                        .attr('clip-path', `url(#clip-${id})`);

                    g.append('g')
                        .attr('class', 'axis')
                        .attr('transform', `translate(0,${height})`)
                        .call(axis);

                    // Initialize the brush component with pretty resize handles.
                    gBrush = g.append('g')
                        .attr('class', 'brush')
                        .call(brush);

                    gBrush.selectAll('.handle--custom')
                        .data([{ type: 'w' }, { type: 'e' }])
                        .enter().append('path')
                        .attr('class', 'brush-handle')
                        .attr('cursor', 'ew-resize')
                        .attr('d', resizePath)
                        .style('display', 'none');
                }

                // Only redraw the brush if set externally.
                if (brushDirty !== false) {
                    const filterVal = brushDirty;
                    brushDirty = false;

                    div.select('.title a').style('display', d3.brushSelection(div) ? null : 'none');

                    if (!filterVal) {
                        g.call(brush);

                        g.selectAll(`#clip-${id} rect`)
                            .attr('x', 0)
                            .attr('width', width);

                        g.selectAll('.brush-handle').style('display', 'none');
                        renderAll();
                    } else {
                        const range = filterVal.map(x);
                        brush.move(gBrush, range);
                    }
                }

                g.selectAll('.bar').attr('d', barPath);
            });

            function barPath(groups) {
                const path = [];
                let i = -1;
                const n = groups.length;
                let d;
                while (++i < n) {
                    d = groups[i];
                    path.push('M', x(d.key), ',', height, 'V', y(d.value), 'h9V', height);
                }
                return path.join('');
            }

            function resizePath(d) {
                const e = +(d.type === 'e');
                const x = e ? 1 : -1;
                const y = height / 3;
                return `M${0.5 * x},${y}A6,6 0 0 ${e} ${6.5 * x},${y + 6}V${2 * y - 6}A6,6 0 0 ${e} ${0.5 * x},${2 * y}ZM${2.5 * x},${y + 8}V${2 * y - 8}M${4.5 * x},${y + 8}V${2 * y - 8}`;
            }
        }

        brush.on('start.chart', function () {
            const div = d3.select(this.parentNode.parentNode.parentNode);
            div.select('.title a').style('display', null);
        });

        brush.on('brush.chart', function () {
            const g = d3.select(this.parentNode);
            const brushRange = d3.event.selection || d3.brushSelection(this); // attempt to read brush range
            const xRange = x && x.range(); // attempt to read range from x scale
            let activeRange = brushRange || xRange; // default to x range if no brush range available

            const hasRange = activeRange &&
                activeRange.length === 2 &&
                !isNaN(activeRange[0]) &&
                !isNaN(activeRange[1]);

            if (!hasRange) return; // quit early if we don't have a valid range

            // calculate current brush extents using x scale
            let extents = activeRange.map(x.invert);

            // if rounding fn supplied, then snap to rounded extents
            // and move brush rect to reflect rounded range bounds if it was set by user interaction
            if (round) {
                extents = extents.map(round);
                activeRange = extents.map(x);

                if (
                    d3.event.sourceEvent &&
                    d3.event.sourceEvent.type === 'mousemove'
                ) {
                    d3.select(this).call(brush.move, activeRange);
                }
            }

            // move brush handles to start and end of range
            g.selectAll('.brush-handle')
                .style('display', null)
                .attr('transform', (d, i) => `translate(${activeRange[i]}, 0)`);

            // resize sliding window to reflect updated range
            g.select(`#clip-${id} rect`)
                .attr('x', activeRange[0])
                .attr('width', activeRange[1] - activeRange[0]);

            // filter the active dimension to the range extents
            dimension.filterRange(extents);

            // re-render the other charts accordingly
            renderAll();
        });

        brush.on('end.chart', function () {
            // reset corresponding filter if the brush selection was cleared
            // (e.g. user "clicked off" the active range)
            if (!d3.brushSelection(this)) {
                reset(id);
            }
        });

        chart.margin = function (_) {
            if (!arguments.length) return margin;
            margin = _;
            return chart;
        };

        chart.x = function (_) {
            if (!arguments.length) return x;
            x = _;
            axis.scale(x);
            return chart;
        };

        chart.y = function (_) {
            if (!arguments.length) return y;
            y = _;
            return chart;
        };

        chart.dimension = function (_) {
            if (!arguments.length) return dimension;
            dimension = _;
            return chart;
        };

        chart.filter = _ => {
            if (!_) dimension.filterAll();
            brushDirty = _;
            return chart;
        };

        chart.group = function (_) {
            if (!arguments.length) return group;
            group = _;
            return chart;
        };

        chart.round = function (_) {
            if (!arguments.length) return round;
            round = _;
            return chart;
        };

        chart.gBrush = () => gBrush;

        return chart;
    }



    function filterBricks(bricks) {
        data = bricks.filter(brick =>
            brick && brick.properties && brick.properties.data_portals2019 && brick.properties.data_portals2019._id
        )
        return data;
    };

    function mapBricks(bricks, indicators) {
        data = bricks.map((brick, index) => {
            let temp = {};
            temp['i'] = index;
            temp['id'] = brick.properties.id;
            indicators.forEach((indicator) => {
                temp[indicator.key] = + brick.properties.data_portals2019[indicator.grupo][indicator.key];
            });
            return temp;
        });
        return data;
    }

    function buildHtmlContainers(indicators) {
        let $div = d3.select("#charts")
            .selectAll("div")
            .data(indicators)
            .enter()
            .append("div")
            .attr("id", d => d.key)
            .classed("chart", true)
            .append("div")
            .classed("title", true)
            .text(d => d.screen_name);
    }

    function buildDimensions(brick, indicators) {
        let ranges = [];
        // build the array to store dimensions and groups -ranges-
        indicators.forEach((indicator) => {
            let temp =
            {
                key: indicator.key,
                dimension: brick.dimension(d => Math.max(indicator.values.floor, Math.min(indicator.values.ceil, d[indicator.key])))
            }
            // groups of 50 (ranges)
            temp["group"] = temp.dimension.group(d => Math.floor(d / 50) * 50);
            ranges.push(temp);
        });
        return ranges;
    }

    function buildCharts(ranges, indicators) {
        return indicators.map((indicator) => {
            let range = ranges.filter(d => d.key === indicator.key);
            return barChart()
                .dimension(range[0].dimension)
                .group(range[0].group)
                .x(d3.scaleLinear()
                    .domain([indicator.values.floor, indicator.values.ceil])
                    .rangeRound([0, 10 * 40]));
        });

    }

    function drawCharts(charts) {
        const chart = d3.selectAll('.chart')
            .data(charts);
        return chart;
    }

    function drawTotalNumber(brick) {
        return d3.selectAll('#total')
            .text(formatNumber(brick.size()));
    }

    function drawAllValueNumbers() {
        return d3.select('#active').text(formatNumber(crossAll.value()));
    }

    // Renders the specified chart or list.

    // Whenever the brush moves, re-rendering everything.
    function renderAll() {
        chart.each((method, index, arr) => {
            render(method, index, arr);
        });
        drawAllValueNumbers();
    }
    let render = (method, index, arr) => {
        d3.select(arr[index]).call(method);
    };



    function initCrossfilters() {
        Promise.all([p1, p2, p3])
            .then(([bricks, activeIndicator, analyticsIndicators]) => {


                // divs
                buildHtmlContainers(analyticsIndicators);
                // filter valid bricks (with data portals)
                filterBricks(bricks);
                // build the objects for crossfilter
                mapBricks(data, analyticsIndicators);
                // build the array to store dimensions and groups -stored in ranges array-
                const crossBrick = crossfilter(data);
                crossAll = crossBrick.groupAll();
                const crossRanges = buildDimensions(crossBrick, analyticsIndicators);

                const charts = buildCharts(crossRanges, analyticsIndicators);

                let x = d3.selectAll('.chart');
                chart = d3.selectAll('.chart')
                    .data(charts);

                drawTotalNumber(crossBrick);
                renderAll();

                //d3.select('#active').text(formatNumber(all.value()));



                let y = data;
            });
    };



    let init = () => {
        initCrossfilters();
        return false;
    };

    init();




})(document, d3);