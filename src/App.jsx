import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Clock } from 'lucide-react';

export default function FastexOrderBook() {
    const [orderBook, setOrderBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    // --- Data Formatting & Calculations ---

    const formatPrice = (price) => {
        return parseFloat(price).toFixed(6);
    };

    const formatAmount = (amount) => {
        return parseFloat(amount).toFixed(2);
    };

    const formatTotal = (price, amount) => {
        return (parseFloat(price) * parseFloat(amount)).toFixed(2);
    };

    const calculateSpread = () => {
        if (!orderBook?.asks?.[0] || !orderBook?.bids?.[0]) return null;

        const lowestAsk = parseFloat(orderBook.asks[0][0]);
        const highestBid = parseFloat(orderBook.bids[0][0]);
        const spread = lowestAsk - highestBid;
        const spreadPercent = ((spread / highestBid) * 100).toFixed(4);

        return { spread: spread.toFixed(6), spreadPercent };
    };

    // Calculate the maximum total value across all bids and asks to normalize the depth visualization
    const maxAskTotal = orderBook?.asks?.reduce((max, order) => Math.max(max, parseFloat(order[0]) * parseFloat(order[1])), 0) || 0;
    const maxBidTotal = orderBook?.bids?.reduce((max, order) => Math.max(max, parseFloat(order[0]) * parseFloat(order[1])), 0) || 0;
    const getMaxTotal = () => Math.max(maxAskTotal, maxBidTotal, 1); // Ensure it's not zero

    // --- API Fetch Logic ---

    const fetchOrderBook = async () => {
        setLoading(true);
        setError(null);

        try {
            // Using CORS proxy to bypass browser restrictions
            const corsProxy = 'https://corsproxy.io/?';
            const apiUrlNoLimit = 'https://exchange.fastex.com/api/spot/v1/orderbook?symbol=FTN-USDT';

            const endpoints = [
                corsProxy + encodeURIComponent(apiUrlNoLimit),
                'https://exchange.fastex.com/api/spot/v1/orderbook?symbol=FTN-USDT'
            ];

            let response = null;
            let lastError = null;

            for (const endpoint of endpoints) {
                try {
                    response = await fetch(endpoint);
                    if (response.ok) {
                        const data = await response.json();
                        setOrderBook(data);
                        setLastUpdate(new Date());
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    lastError = err;
                    continue;
                }
            }

            throw new Error(lastError?.message || 'Unable to fetch order book from any endpoint. CORS or API issue.');

        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderBook();

        const interval = setInterval(fetchOrderBook, 5000);
        return () => clearInterval(interval);
    }, []);

    // --- Loading & Error States ---

    if (loading && !orderBook) {
        return (
            <div className="loading-state">
                <div className="loading-card">
                    <RefreshCw className="loading-icon animate-spin" />
                    <p className="loading-text">Connecting to Fastex Order Book...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-state">
                <div className="error-card">
                    <h2 className="error-title">Connection Error</h2>
                    <p className="error-message">{error}</p>
                    <p className="error-detail">
                        The API call failed, likely due to browser **CORS restrictions** or an invalid endpoint. Data fetch is attempted every 5 seconds.
                    </p>
                    <button
                        onClick={fetchOrderBook}
                        className="retry-button"
                    >
                        <RefreshCw className="icon-small" />
                        Force Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    // --- Main Component Render ---

    const spread = calculateSpread();
    const asksToRender = orderBook?.asks?.slice(0, 30).reverse() || [];
    const bidsToRender = orderBook?.bids?.slice(0, 30) || [];

    return (
        <div className="orderbook-app">
            <div className="orderbook-main-content">

                {/* Header and Refresh Button */}
                <div className="card header-card">
                    <div className="header-content">
                        <div>
                            <h1 className="header-title">FTN/USDT</h1>
                            <p className="header-subtitle">Fastex Spot Market Order Book</p>
                        </div>
                        <button
                            onClick={fetchOrderBook}
                            disabled={loading}
                            className={`refresh-button ${loading ? 'button-disabled' : ''}`}
                        >
                            <RefreshCw className={`icon-small ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Refreshing...' : 'Live Refresh'}
                        </button>
                    </div>

                    {lastUpdate && (
                        <p className="last-update-text">
                            <Clock className="icon-tiny" />
                            Last Data Fetch: {lastUpdate.toLocaleTimeString()}
                        </p>
                    )}
                </div>

                {/* Spread & Summary */}
                <div className="card spread-card">
                    {spread ? (
                        <>
                            <p className="spread-label">Current Spread</p>
                            <div className="spread-value">
                                {spread.spread}
                            </div>
                            <p className="spread-percent">
                                <span className="spread-percent-value">{spread.spreadPercent}%</span> gap between Best Bid and Ask
                            </p>
                        </>
                    ) : (
                        <p className="spread-calculating">Calculating Spread...</p>
                    )}
                </div>

                {/* Order Columns */}
                    {/* Asks (Sell Orders) Column */}
                    <div className="card asks-column">
                        <div className="column-header">
                            <TrendingDown className="icon-medium ask-color" />
                            <h2 className="column-title ask-color">ASKS (Sell)</h2>
                        </div>

                        <div className="table-wrapper">
                            <table className="order-table">
                                <thead>
                                <tr className="table-header-row">
                                    <th className="table-header-cell align-left">Price (USDT)</th>
                                    <th className="table-header-cell align-right">Amount (FTN)</th>
                                    <th className="table-header-cell align-right">Total (USDT)</th>
                                </tr>
                                </thead>
                                <tbody>
                                {asksToRender.map((order, idx) => {
                                    const total = parseFloat(order[0]) * parseFloat(order[1]);
                                    const depthPercentage = (total / getMaxTotal()) * 100;
                                    // Dynamic depth styling remains here
                                    const depthStyle = {
                                        background: `linear-gradient(to right, rgba(244, 63, 94, 0.15) ${depthPercentage}%, transparent ${depthPercentage}%)`,
                                    };
                                    return (
                                        <tr
                                            key={`ask-${idx}`}
                                            className="ask-row"
                                            style={depthStyle}
                                        >
                                            <td className={`ask-price ${idx === asksToRender.length - 1 ? 'best-order' : ''}`}>
                                                {formatPrice(order[0])}
                                            </td>
                                            <td className="order-amount">
                                                {formatAmount(order[1])}
                                            </td>
                                            <td className="order-total">
                                                {formatTotal(order[0], order[1])}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                        {orderBook?.asks?.length > 30 && (
                            <p className="table-footer">... {orderBook.asks.length - 30} more orders hidden for display clarity</p>
                        )}
                    </div>

                    {/* Bids (Buy Orders) Column */}
                    <div className="card bids-column">
                        <div className="column-header">
                            <TrendingUp className="icon-medium bid-color" />
                            <h2 className="column-title bid-color">BIDS (Buy)</h2>
                        </div>

                        <div className="table-wrapper">
                            <table className="order-table">
                                <thead>
                                <tr className="table-header-row">
                                    <th className="table-header-cell align-left">Price (USDT)</th>
                                    <th className="table-header-cell align-right">Amount (FTN)</th>
                                    <th className="table-header-cell align-right">Total (USDT)</th>
                                </tr>
                                </thead>
                                <tbody>
                                {bidsToRender.map((order, idx) => {
                                    const total = parseFloat(order[0]) * parseFloat(order[1]);
                                    const depthPercentage = (total / getMaxTotal()) * 100;
                                    // Dynamic depth styling remains here
                                    const depthStyle = {
                                        background: `linear-gradient(to left, rgba(16, 185, 129, 0.15) ${depthPercentage}%, transparent ${depthPercentage}%)`,
                                    };
                                    return (
                                        <tr
                                            key={`bid-${idx}`}
                                            className="bid-row"
                                            style={depthStyle}
                                        >
                                            <td className={`bid-price ${idx === 0 ? 'best-order' : ''}`}>
                                                {formatPrice(order[0])}
                                            </td>
                                            <td className="order-amount">
                                                {formatAmount(order[1])}
                                            </td>
                                            <td className="order-total">
                                                {formatTotal(order[0], order[1])}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                        {orderBook?.bids?.length > 30 && (
                            <p className="table-footer">... {orderBook.bids.length - 30} more orders hidden for display clarity</p>
                        )}
                    </div>

                {/* Detailed Summary Stats */}
                <div className="card summary-card">
                    <h3 className="summary-title">Market Data Snapshot</h3>
                    <div className="summary-grid">
                        <div className="summary-item">
                            <p className="summary-label">Total Asks Count</p>
                            <p className="summary-value ask-color">{orderBook.asks?.length || 0}</p>
                        </div>
                        <div className="summary-item">
                            <p className="summary-label">Total Bids Count</p>
                            <p className="summary-value bid-color">{orderBook.bids?.length || 0}</p>
                        </div>
                        <div className="summary-item">
                            <p className="summary-label">Best Ask Price</p>
                            <p className="summary-value ask-color font-mono">
                                {orderBook.asks?.[0] ? formatPrice(orderBook.asks[0][0]) : 'N/A'}
                            </p>
                        </div>
                        <div className="summary-item">
                            <p className="summary-label">Best Bid Price</p>
                            <p className="summary-value bid-color font-mono">
                                {orderBook.bids?.[0] ? formatPrice(orderBook.bids[0][0]) : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
