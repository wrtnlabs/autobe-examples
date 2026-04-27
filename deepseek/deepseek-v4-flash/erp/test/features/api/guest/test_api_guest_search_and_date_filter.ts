import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_search_and_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create a local connection copy (no authentication needed for this endpoint)
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 1: Search by partial device fingerprint
  const searchResult = await api.functional.hrmTimeTracking.guests.index(
    guestConnection,
    {
      body: {
        search: "a",
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackingGuest.IRequest,
    },
  );
  typia.assert(searchResult);
  // Verify search filter: all returned records must contain the search text
  for (const guest of searchResult.data) {
    TestValidator.predicate(
      "device_fingerprint contains search text 'a'",
      guest.device_fingerprint.toLowerCase().includes("a"),
    );
  }
  // Step 2: Date range filtering (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateResult = await api.functional.hrmTimeTracking.guests.index(
    guestConnection,
    {
      body: {
        created_at_from: thirtyDaysAgo.toISOString(),
        created_at_to: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackingGuest.IRequest,
    },
  );
  typia.assert(dateResult);
  // Verify date range filter: all returned records within inclusive range
  const fromMs: number = thirtyDaysAgo.getTime();
  const toMs: number = now.getTime();
  for (const guest of dateResult.data) {
    const createdAtMs: number = new Date(guest.created_at).getTime();
    TestValidator.predicate(
      "created_at within [from, to] range",
      createdAtMs >= fromMs && createdAtMs <= toMs,
    );
  }
  // Step 3: Combined search + date range filter (intersection)
  const combinedResult = await api.functional.hrmTimeTracking.guests.index(
    guestConnection,
    {
      body: {
        search: "a",
        created_at_from: thirtyDaysAgo.toISOString(),
        created_at_to: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackingGuest.IRequest,
    },
  );
  typia.assert(combinedResult);
  // Verify both filters applied as intersection
  for (const guest of combinedResult.data) {
    TestValidator.predicate(
      "combined: device_fingerprint contains 'a'",
      guest.device_fingerprint.toLowerCase().includes("a"),
    );
    const createdAtMs: number = new Date(guest.created_at).getTime();
    TestValidator.predicate(
      "combined: created_at within range",
      createdAtMs >= fromMs && createdAtMs <= toMs,
    );
  }
  // Step 4: No-match search returns empty results with valid pagination
  const noMatchResult = await api.functional.hrmTimeTracking.guests.index(
    guestConnection,
    {
      body: {
        search: "zzzzz_nonexistent",
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackingGuest.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no-match: data array is empty",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no-match: records = 0",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no-match: pages = 0",
    noMatchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "no-match: current = 1",
    noMatchResult.pagination.current,
    1,
  );
  // Step 5: Only created_at_from without created_at_to handles gracefully
  const fromOnlyResult = await api.functional.hrmTimeTracking.guests.index(
    guestConnection,
    {
      body: {
        created_at_from: thirtyDaysAgo.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackingGuest.IRequest,
    },
  );
  typia.assert(fromOnlyResult);
  // The system handles from-only gracefully returning valid pagination
  TestValidator.predicate(
    "from-only filter returns valid pagination",
    fromOnlyResult.pagination.current >= 0,
  );
}
