import Grid6 from "./grid6";

// const puzzle = {
//   grid: [
//     ["2", "+", "3"],
//     ["*", "+", "-"],
//     ["4", "-", "1"],
//   ],
//   result: 9,
// };

export default function App() {
  return (
    <div
      className="h-[100vh]"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <h1
        className="text-2xl font-bold mb-4"
        style={{ textAlign: "center", fontSize: "1.5rem" }}
      >
        Matiks
      </h1>
      <Grid6 />
    </div>
  );
}
