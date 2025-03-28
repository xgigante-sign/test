import React, { useState, useEffect } from 'react';

const App = () => {
  const [count, setCount] = useState(0);

  // Error 1: Uso de console.log en el código
  console.log('Component rendered');

  // Error 2: Bucle infinito por condición incorrecta
  if (true) {
    console.log('Esto está en un bucle infinito');
  }

  // Error 3: Variable no utilizada
  let unusedVariable = 'Esto no se usa';

  // Error 4: Uso de "any" en TypeScript
  const handleChange = (event: any) => {
    console.log(event.target.value);
  };

  // Error 5: Falta de clave en la lista de elementos
  const listItems = ['Item 1', 'Item 2', 'Item 3'].map((item) => <li>{item}</li>);

  // Error 6: Olvido de dependencia en useEffect
  useEffect(() => {
    console.log('Este efecto debería tener una dependencia.');
  }, []); // Aquí falta la dependencia `count`

  // Error 7: Uso de función recursiva sin condición de salida
  const recursiveFunction = (n: number) => {
    console.log(n);
    recursiveFunction(n - 1); // No tiene base de caso, esto causará un desbordamiento de pila
  };

  // Error 8: Falta de validación de tipo de props (para componentes)
  const UserCard = ({ name, age }: any) => {
    return (
      <div>
        <h1>{name}</h1>
        <p>{age}</p>
      </div>
    );
  };

  // Error 9: Re-render innecesario debido a uso incorrecto de setState
  const incrementCount = () => {
    setCount(count + 1);
  };

  // Error 10: Código no utilizado (comentado o muerto)
  // const someUnusedFunction = () => {
  //   return 'I am never called';
  // };

  return (
    <div>
      <h1>React App</h1>
      <button onClick={incrementCount}>Increment</button>
      <ul>{listItems}</ul>
      <UserCard name="John Doe" age={30} />
    </div>
  );
};

export default App;