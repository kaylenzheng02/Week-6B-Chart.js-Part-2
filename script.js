//fetch data from Citi Bikes
async function getBikeData() {
    const [statusRes, infoRes] = await Promise.all([
        fetch('https://gbfs.citibikenyc.com/gbfs/en/station_status.json'),
        fetch('https://gbfs.citibikenyc.com/gbfs/en/station_information.json')
    ]);

    //await acts the same way as .then() here
    const statusData = await statusRes.json();
    const infoData = await infoRes.json();

    return {
        statuses: statusData.data.stations,
        infos: infoData.data.stations,
        ttl: statusData.ttl // seconds until this data may be stale — used later
    };
}

//joins data into a single javascript object based on station id
function joinStationData(statuses, infos) {
    return statuses.map(status => {
        const info = infos.find(i => i.station_id === status.station_id);
        return {
            id: status.station_id,
            name: info ? info.name : 'Unknown Station',
            bikesAvailable: status.num_bikes_available,
            ebikesAvailable: status.num_ebikes_available,
            isRenting: status.is_renting === 1
        };
    });
}

let bikeChart; // declared outside so it persists across calls
let refreshTimer;

Chart.defaults.font.family = '"Geist", sans-serif';

async function renderChart() {
    clearTimeout(refreshTimer);

    const { statuses, infos, ttl } = await getBikeData();
    const joined = joinStationData(statuses, infos);

    const topStations = joined
        .filter(station => station.isRenting)
        .sort((a, b) => b.bikesAvailable - a.bikesAvailable)
        .slice(0, 10);

    const names = topStations.map(s => s.name);
    const bikes = topStations.map(s => s.bikesAvailable);
    const ebikes = topStations.map(s => s.ebikesAvailable);

    if (bikeChart) {
        // update its data instead of making a new one
        bikeChart.data.labels = names;
        bikeChart.data.datasets[0].data = bikes;
        bikeChart.data.datasets[1].data = ebikes;
        bikeChart.update();
    } else {
        // create chart
        bikeChart = new Chart(document.getElementById('bikeChart'), {
            type: 'bar',
            data: {
                labels: names,
                datasets: [
                    {
                        label: 'Bikes Available',
                        data: bikes,
                        backgroundColor: '#B3C567',
                        hoverBackgroundColor: '#85983A'
                    },
                    {
                        label: 'E-bikes Available',
                        data: ebikes,
                        backgroundColor: '#e07a3d',
                        hoverBackgroundColor: '#B4541D'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Celery vs. Carrots at the 10 Stations with the Most Vegetables'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // show when this refresh happened
    document.getElementById('lastUpdated').textContent =
        `Last updated: ${new Date().toLocaleTimeString()}`;

    // schedule the NEXT refresh based on how long this data is valid for,
    // rather than an arbitrary fixed number
    refreshTimer = setTimeout(renderChart, ttl * 1000);
}

document.getElementById('refreshBtn').addEventListener('click', renderChart);

document.fonts.ready.then(renderChart);