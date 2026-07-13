import { IpcMainInvokeEvent } from "electron";

interface NativeResponse {
    status: number;
    data: string;
}

function endpoint(baseUrl: string, userId: string): string {
    return `${baseUrl.replace(/\/+$/, "")}/larp/${encodeURIComponent(userId)}`;
}

export async function syncPull(_: IpcMainInvokeEvent, baseUrl: string, userId: string, secret: string): Promise<NativeResponse> {
    try {
        const res = await fetch(endpoint(baseUrl, userId), {
            method: "GET",
            headers: { Authorization: `Bearer ${secret}` }
        });
        return { status: res.status, data: await res.text() };
    } catch (e) {
        return { status: -1, data: e instanceof Error ? e.message : String(e) };
    }
}

export async function syncPush(_: IpcMainInvokeEvent, baseUrl: string, userId: string, secret: string, payload: string): Promise<NativeResponse> {
    try {
        const res = await fetch(endpoint(baseUrl, userId), {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json"
            },
            body: payload
        });
        return { status: res.status, data: await res.text() };
    } catch (e) {
        return { status: -1, data: e instanceof Error ? e.message : String(e) };
    }
}
