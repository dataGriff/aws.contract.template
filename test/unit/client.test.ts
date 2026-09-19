import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, createClient, getTodo, listTodos } from "../../src/client.js";

// The hand-written layer over the generated client: auth headers on every
// call, and non-2xx responses surfaced as a typed ApiError instead of a
// problem document typed as the success body.
const problem = {
  type: "about:blank",
  title: "Not Found",
  status: 404,
  detail: "todo not found",
  request_id: "req-1",
};

function stubFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const fetchMock = vi.fn(
    () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json", ...headers },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("createClient", () => {
  it("adds the bearer token and API key and returns the body on 2xx", async () => {
    const fetchMock = stubFetch(200, { items: [], next_cursor: null });
    const { client } = createClient({
      baseURL: "https://api.example.com/v1",
      token: () => Promise.resolve("t0k3n"),
      apiKey: "k3y",
    });
    const page = await listTodos({}, { client });
    expect(page).toEqual({ items: [], next_cursor: null });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string | URL, RequestInit];
    expect(url instanceof URL ? url.href : url).toMatch(/^https:\/\/api\.example\.com\/v1\/todos/);
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer t0k3n");
    expect(headers.get("x-api-key")).toBe("k3y");
  });

  it("throws a typed ApiError carrying the problem body and request id on non-2xx", async () => {
    stubFetch(404, problem, { "x-request-id": "req-1" });
    const { client } = createClient({ baseURL: "https://api.example.com/v1", token: "t" });
    const err = await getTodo("00000000-0000-4000-8000-000000000000", { client }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ApiError);
    const apiError = err as ApiError;
    expect(apiError.status).toBe(404);
    expect(apiError.problem?.detail).toBe("todo not found");
    expect(apiError.requestId).toBe("req-1");
    expect(apiError.message).toBe("todo not found");
  });
});
