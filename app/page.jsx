"use client"; // only if page needs client hooks
import Simulation from "./components/simulation";
import Console from "./components/console";
// import Categories from "./components/categories";

export default function Home() {
  return (
    <main>
      {/* <Categories /> */}
      <Simulation />
      <Console />
    </main>
  );
}
