import d3 from 'd3';

export default function StackedBarChart (
  {
    data,
    data1
  },
  {
    containerSelector,
    width = 800, 
    height = 100, 
    margin = { left: 0, top: 40 },
    rectHeight = 20
  } = {}
) {
  const tooltipWidth = 120;

  let clicked = {};
  const container = d3.select(containerSelector);

  const svg = container
    .append('svg')
    .attr('width', width + margin.left)
    .attr('height', height + margin.top);

  const g = svg
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);
  const nodeG = g.append('g').attr('class', 'nodes');

  // place all texts above rectangles
  const nodeTextG = g.append('g').attr('class', 'nodeText');
  const textG = g.append('g').attr('class', 'labels');

  const tooltip = container
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('width', tooltipWidth / 2)
    .style('opacity', 0);

  updateChart(data, data1)

  function updateChart(data, data1) {
    const yScale = d3
      .scaleBand()
      .domain(d3.range(0, data.length))
      .range([0, height])
      .padding(0.1);

    // Iterate over each object (row) in data and draw stacked barchart
    data.forEach((d, row) => {
      Object.keys(d).forEach((key) => {
        // calculate y-pos of each row for current and future states
        d[key].y = yScale(row);
        data1[row][key].y = yScale(row);
      });
      clicked[row] = false; // track click state per row
      updateRects(d, data1[row], row);
    });
  }

  function updateRects(data, data1, row) {
    // Sum of values in a row
    let totalValue = 0;
    let totalOverlap = 0;
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        totalValue += data[key].value - (data[key].overlap || 0);
        totalOverlap += data[key].overlap || 0;
        data[key].accumOverlap = totalOverlap; // to offset current x-position based on overlap of all previous rectangles
      }
    }

    const xScale = d3.scaleLinear().domain([0, totalValue]).range([0, width]);

    // Restructure data to be able to stack
    const dataNew = [
      Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, xScale(value.value)])
      ),
    ];

    const keys = Object.keys(data);
    const nodes = d3.stack().keys(keys)(dataNew);

    nodeG
      .selectAll(`.node-${row}`)
      .data(nodes, (d) => d.key)
      .join(
        (enter) => {
          const newNode = enter
            .append('g')
            .attr('class', (d) => `node-${row} node-${d.key}`)
            .attr('transform', (d, i) => {
              const { x, y } = getCoords(d[0][0], 0, data[d.key], i);
              return `translate(${x}, ${y})`;
            })
            .attr('opacity', 1)
            .attr('pointer-events', 'auto')
            .attr('cursor', 'pointer');

          newNode
            .append('rect')
            .attr('width', (d) => d[0][1] - d[0][0])
            .attr('height', rectHeight)
            .attr('fill', (d) => data[d.key].color)
            .attr('stroke', (d) => data[d.key].color)
            .attr('fill-opacity', 1)
            .attr('stroke-opacity', 1)
            .attr('stroke-width', 1);

          return newNode;
        },
        (update) => {
          const newUpdate = update
            .transition()
            .duration(1000)
            .attr('transform', (d, i) => {
              const { x, y } = getCoords(d[0][0], 0, data[d.key], i);
              return `translate(${x}, ${y})`;
            });

          update
            .select('rect')
            .transition()
            .duration(1000)
            .attr('width', (d) => {
              return d[0][1] - d[0][0];
            });

          // enable interactivity that syncs with updated data
          action(nodeG.selectAll(`.node-${row}`), row);

          return newUpdate;
        },
        (exit) => exit.remove()
      );

    nodeTextG
      .selectAll(`.nodeText-${row}`)
      .data(nodes, (d) => d.key)
      .join(
        (enter) => {
          const newNode = enter
            .append('g')
            .attr('class', (d) => `nodeText-${row} nodeText-${d.key}`)
            .attr('transform', (d, i) => {
              const { x, y } = getCoords(d[0][0], 0, data[d.key], i);
              return `translate(${x}, ${y})`;
            })
            .attr('opacity', 1)
            .attr('pointer-events', 'auto')
            .attr('cursor', 'pointer');

          newNode
            .append('text')
            .attr('x', (d) => (d[0][1] - d[0][0]) / 2)
            .attr('y', rectHeight / 2)
            .attr('fill', '#000')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .attr('dominant-baseline', 'middle')
            .attr('text-anchor', 'middle')
            .attr('visibility', (d) =>
              d[0][1] - d[0][0] < 80 ? 'hidden' : 'visible'
            )
            .text((d) => d.key);

          return newNode;
        },
        (update) => {
          const newUpdate = update
            .transition()
            .duration(1000)
            .attr('transform', (d, i) => {
              const { x, y } = getCoords(d[0][0], 0, data[d.key], i);
              return `translate(${x}, ${y})`;
            });

          update
            .select('text')
            .transition()
            .duration(1000)
            .attr('x', (d) => (d[0][1] - d[0][0]) / 2)
            .attr('visibility', (d) =>
              d[0][1] - d[0][0] < 80 ? 'hidden' : 'visible'
            );

          action(nodeTextG.selectAll(`.nodeText-${row}`), row);

          return newUpdate;
        },
        (exit) => exit.remove()
      );

    textG
      .selectAll(`.label-${row}`)
      .data(nodes, (d) => d.key)
      .join(
        (enter) => {
          const newText = enter
            .append('g')
            .attr('class', (d) => `label-${row} label-${d.key}`)
            .attr('transform', (d, i) => {
              const { x, y } = getCoords(
                d[0][0] + (d[0][1] - d[0][0]) / 2,
                rectHeight,
                data[d.key],
                i
              );
              return `translate(${x}, ${y})`;
            })
            .attr('visibility', (d) =>
              d[0][1] - d[0][0] < 80 ? 'hidden' : 'visible'
            );

          newText
            .append('text')
            .attr('transform', (d) => `translate(0, ${10})`)
            .attr('fill', '#000')
            .attr('font-size', '12px')
            .attr('font-weight', 'normal')
            .attr('dominant-baseline', 'middle')
            .attr('text-anchor', 'middle')
            .text((d) => data[d.key].value);

          return newText;
        },
        (update) => {
          const newUpdate = update
            .transition()
            .duration(1000)
            .attr('transform', (d, i) => {
              const { x, y } = getCoords(
                d[0][0] + (d[0][1] - d[0][0]) / 2,
                rectHeight,
                data[d.key],
                i
              );
              return `translate(${x}, ${y})`;
            })
            .attr('visibility', (d) =>
              d[0][1] - d[0][0] < 80 ? 'hidden' : 'visible'
            );

          update.select('text').text((d) => data[d.key].value);

          return newUpdate;
        },
        (exit) => exit.remove()
      );

    function getCoords(X, Y, d, i) {
      let x = X - xScale(d.accumOverlap);
      let y = Y + d.y + (d.overlap > 0 ? i * 6 : 0);
      return { x, y };
    }

    function action(elements, row) {
      elements
        .on('click', function (event, dd) {
          event.preventDefault();
          clickRect(dd, row);
        })
        .on('mouseover', function (event, dd) {
          event.preventDefault();
          const rect = d3.select(`.node-${dd.key} rect`);
          mouseOver(rect, data, dd);
        })
        .on('mouseout', function (event, dd) {
          const rect = d3.select(`.node-${dd.key} rect`);
          mouseOut(rect);
        });
    }

    function mouseOver(rect, data, dd) {
      // Scale up the rectangle on hover
      const growPx = 5;
      rect
        .transition()
        .duration(350)
        .attr('x', -growPx)
        .attr('y', -growPx)
        .attr('width', (d) => d[0][1] - d[0][0] + growPx)
        .attr('height', rectHeight + growPx * 2);

      tooltip.transition().duration(200).style('opacity', 1);

      const { x, y } = getCoords(
        dd[0][0] + (dd[0][1] - dd[0][0]) / 2 - tooltipWidth / 2,
        0,
        data[dd.key],
        dd.index
      );

      tooltip
        .html(`<b>${dd.key}: </b>${data[dd.key].value}`)
        .style('left', x + 'px')
        .style('top', y + 'px');
    }

    function mouseOut(rect) {
      // Reset the rectangle size on mouseout
      rect
        .transition()
        .duration(350)
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', (d) => d[0][1] - d[0][0])
        .attr('height', rectHeight);

      tooltip.transition().duration(200).style('opacity', 0);
    }

    function clickRect(dd, row) {
      tooltip.transition().style('opacity', 0);
      updateRects(data1, data, row);
    }
  }

  return {
    /* public data update  method */
    update: ({data, data1}) => {
      updateChart(data, data1)
    },
    /* event subscription method, provides interface for graph specific events e.g. click on node */
    on: (eventName, callback) => {
      if(eventName === 'nodeClick') {
        nodeG.selectAll('g').on('click', function (event, d) {
          // Call the provided callback with the relevant information
          callback({
            clickedNodeData: d,
          });
        });
      }
    }
  }
}

