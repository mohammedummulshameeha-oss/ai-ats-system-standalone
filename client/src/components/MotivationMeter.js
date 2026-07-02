import React from "react";

export default function MotivationMeter({ score }) {
  const getColor = () => {
    if (score < 40) return "red";
    if (score < 70) return "orange";
    return "green";
  };

  return (
    <div style={styles.container}>
      <h3>📊 ATS Score</h3>

      <div style={styles.barBackground}>
        <div
          style={{
            ...styles.barFill,
            width: `${score}%`,
            backgroundColor: getColor(),
          }}
        />
      </div>

      <h2 style={{ color: getColor() }}>{score}% Match</h2>
    </div>
  );
}

const styles = {
  container: {
    textAlign: "center",
    marginBottom: "20px",
  },
  barBackground: {
    width: "100%",
    height: "15px",
    background: "#ddd",
    borderRadius: "10px",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    transition: "width 0.5s ease-in-out",
  },
};