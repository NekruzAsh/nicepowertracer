import Simulation from "./components/simulation";
import Console from "./components/console";
// import Categories from "./components/categories";
import Tester from "./components/Catagories/tester";

export default function Home() {
  return (
    <main>
      {/* <Categories /> */}
      <Tester />
      <Simulation />
      <Console />
    </main>
  );
}
