"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    async function login() {
        const res = await fetch("http://localhost:3000/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include",
        });

        if (!res.ok) {
            alert("Login failed ❌");
            return;
        }

        const data = await res.json();
        localStorage.setItem("token", data.token);

        alert("Login success ✅");
        router.push("/");
    }

    return (
        <main style={{ padding: 20 }}>
            <h2>Login</h2>

            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <br />
            <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <br />
            <button onClick={login}>Login</button>
        </main>
    );
}
