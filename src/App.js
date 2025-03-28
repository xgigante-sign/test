import { useState, useEffect } from 'react';

export default function InfiniteLoopComponent() {
    const [count, setCount] = useState(0);
    let t: any;

    console.log('test1');

    useEffect(() => {
        setCount((prevCount) => prevCount + 1);
    });

    console.log('test2');

    // test
    return (
        <div className="p-4 text-center">
            <h1 className="text-xl font-bold">Bucle Infinito</h1>
            <p>Contador: {count}</p>
        </div>
    );
}
