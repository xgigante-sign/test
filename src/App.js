import { useState, useEffect } from 'react';

export default function InfiniteLoopComponent() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        setCount((prevCount) => prevCount + 1);
    }); // Falta un array de dependencias, causando el bucle infinito

    return (
        <div className="p-4 text-center">
            <h1 className="text-xl font-bold">Bucle Infinito</h1>
            <p>Contador: {count}</p>
        </div>
    );
}
