import { useState, useEffect } from "react";
import axios from "axios";
import {
    Chart as ChartJS,
    LineElement,
    PointElement,
    BarElement,
    LinearScale,
    TimeScale,
    CategoryScale,
    Tooltip,
    Legend,
    Title,
    Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import "chartjs-adapter-date-fns";

ChartJS.register(
    LineElement,
    BarElement,
    PointElement,
    LinearScale,
    CategoryScale,
    TimeScale,
    Tooltip,
    Legend,
    Title,
    Filler
);

const ChartComponent = () => {
    const [data, setData] = useState([]);
    const [price, setPrice] = useState(0);
    const [percentageChange, setPercentageChange] = useState(0);
    const [error, setError] = useState("");
    const [timeframe, setTimeframe] = useState("7"); // Default timeframe: 7 days
    const [chartType, setChartType] = useState("line"); // Chart type: line or bar
    const [activeTab, setActiveTab] = useState("Chart"); // Active section tab
    const [analytics, setAnalytics] = useState({
        high: 0,
        low: 0,
        volume: 0,
        baseValue: 0, // Base value for profit/loss calculation
    });
    const [sectionData, setSectionData] = useState(null); // Data for sections

    const fetchData = async () => {
        try {
            const response = await axios.get(
                `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart`,
                { params: { vs_currency: "usd", days: timeframe } }
            );
            const prices = response.data.prices;
            const volumes = response.data.total_volumes;

            const mappedData = prices.map(([timestamp, value]) => ({
                x: new Date(timestamp),
                y: value,
            }));

            const latestPrice = prices[prices.length - 1][1];
            const firstPrice = prices[0][1];
            const highPrice = Math.max(...prices.map((p) => p[1]));
            const lowPrice = Math.min(...prices.map((p) => p[1]));
            const totalVolume = volumes.reduce((acc, v) => acc + v[1], 0);

            setData(mappedData);
            setPrice(latestPrice);
            setPercentageChange(((latestPrice - firstPrice) / firstPrice) * 100);
            setAnalytics({
                high: highPrice,
                low: lowPrice,
                volume: totalVolume,
                baseValue: firstPrice,
            });
        } catch (error) {
            setError('Oooops...Error in Fetching data due to multiple request!!!')
            console.error("Error fetching data:", error);
        }
    };

    const fetchSectionData = async (tab) => {
        try {
            const response = await axios.get(
                `https://api.coingecko.com/api/v3/simple/price`,
                {
                    params: { ids: "bitcoin", vs_currencies: "usd" },
                }
            );
            setSectionData(response.data.bitcoin);
        } catch (error) {
            console.error("Error fetching section data:", error);
        }
    };


    useEffect(() => {
        fetchData();
        if (activeTab !== "Chart") fetchSectionData(activeTab);
    }, [timeframe, activeTab]);

    if (error) {
        return (
            <div>
                <div>{error}</div>
                <button onClick={() => window.location.reload()}>
                    Refresh
                </button>
            </div>
        );
    }

    const chartData = {
        datasets: [
            {
                label: "Price (USD)",
                data: data,
                borderColor: "#4A90E2",
                fill: true,
                backgroundColor: "rgba(74, 144, 226, 0.9)",
                tension: 0.4,
            },
        ],
    };

    const options = {
        responsive: true,
        scales: {
            x: {
                type: "time",
                time: { unit: "day" },
                grid: { display: false },
            },
            y: {
                beginAtZero: false,
                grid: { color: "#ddd" },
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `$${context.raw.y.toFixed(2)}`,
                },
            },
        },
    };

    const renderSection = () => {
        switch (activeTab) {
            case "Summary":
                return (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Summary</h2>
                        <p>Bitcoin is currently priced at ${sectionData?.usd} USD.</p>
                    </div>
                );
            case "Statistics":
                return (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Statistics</h2>
                        <p>Highest Price: ${analytics.high.toFixed(2)}</p>
                        <p>Lowest Price: ${analytics.low.toFixed(2)}</p>
                    </div>
                );
            case "Analysis":
                return (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Analysis</h2>
                        <p>
                            The total trading volume is {analytics.volume.toFixed(2)} USD in
                            the last {timeframe} days.
                        </p>
                    </div>
                );
            case "Settings":
                return (
                    <div style={{ marginTop: "20px" }}>
                        <p className="text-lg">Select Chart Type:</p>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <button
                                className={chartType === "line" ? "active-button" : ""}
                                onClick={() => setChartType("line")}
                            >
                                Line Chart
                            </button>
                            <button
                                className={chartType === "bar" ? "active-button" : ""}
                                onClick={() => setChartType("bar")}
                            >
                                Bar Chart
                            </button>
                        </div>
                    </div>
                );
            default:
                return (
                    <div>
                        {chartType === "line" ? (
                            <Line data={chartData} options={options} />
                        ) : (
                            <Bar data={chartData} options={options} />
                        )}

                        {/* Download Button */}
                        <div style={{ marginTop: "20px" }}>
                            <button
                                onClick={downloadCSV}
                                style={{
                                    padding: "10px 20px",
                                    backgroundColor: "#4A90E2",
                                    color: "#fff",
                                    border: "none",
                                    cursor: "pointer",
                                }}
                            >
                                Download Data
                            </button>
                        </div>
                    </div>
                );
        }
    };

    // Function to download data as CSV
    const downloadCSV = () => {
        const header = "Timestamp,Price (USD)\n";
        const csvContent = data
            .map((item) => `${item.x.toISOString()},${item.y.toFixed(2)}`)
            .join("\n");

        const csvFile = header + csvContent;
        const blob = new Blob([csvFile], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `bitcoin_prices_${timeframe}_days.csv`;
        link.click();
    };

    return (
        <div style={{ padding: "20px", backgroundColor: "#f9f9f9", color: "#333" }}>
            {/* Header Section */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                }}
            >
                <div>
                    <h1>${price.toFixed(2)} USD</h1>
                    <p style={{ color: percentageChange > 0 ? "green" : "red" }}>
                        {percentageChange.toFixed(2)}% ({analytics.baseValue.toFixed(2)}{" "}
                        USD)
                    </p>
                </div>
                {activeTab === "Chart" && (
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button
                            className={timeframe === "1" ? "active-button" : ""}
                            onClick={() => setTimeframe("1")}
                        >
                            1d
                        </button>
                        <button
                            className={timeframe === "7" ? "active-button" : ""}
                            onClick={() => setTimeframe("7")}
                        >
                            1w
                        </button>
                        <button
                            className={timeframe === "30" ? "active-button" : ""}
                            onClick={() => setTimeframe("30")}
                        >
                            1m
                        </button>
                        <button
                            className={timeframe === "365" ? "active-button" : ""}
                            onClick={() => setTimeframe("365")}
                        >
                            1y
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs Section */}
            <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                {["Summary", "Chart", "Statistics", "Analysis", "Settings"].map(
                    (tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: "10px 20px",
                                border: "none",
                                backgroundColor: activeTab === tab ? "#4A90E2" : "#ddd",
                                color: activeTab === tab ? "#fff" : "#333",
                                cursor: "pointer",
                            }}
                        >
                            {tab}
                        </button>
                    )
                )}
            </div>

            {/* Content Section */}
            {renderSection()}
        </div>
    );
};

export default ChartComponent;
