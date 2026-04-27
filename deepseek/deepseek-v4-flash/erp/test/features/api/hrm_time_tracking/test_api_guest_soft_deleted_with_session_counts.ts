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

/**
 * Test guest listing with soft-deleted inclusion, session count eager-loading, and custom sorting.
 *
 * Validates the PATCH /hrmTimeTracking/guests endpoint's filtering and sorting capabilities, including soft-delete awareness, computed session counts, and sort direction correctness.
 *
 * Since there are no dedicated API endpoints to create or soft-delete guest records, the test relies on existing database records and performs comparative analysis between queries with different filter flags.
 *
 * 1. Query with includeSoftDeleted=true and verify records count is >= default query (which excludes soft-deleted records).
 * 2. Query with both includeSoftDeleted=true and load.sessionsCount=true, then verify every returned record has a non-negative sessions_count.
 * 3. Query sorted by device_fingerprint ascending and verify alphabetical ordering.
 * 4. Query sorted by created_at ascending (oldest first) and verify chronological ordering.
 */
export async function test_api_guest_soft_deleted_with_session_counts(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for guest operations
  const guestConnection: api.IConnection = { host: connection.host };
  // ---------------------------------------------------------------
  // 1. Include soft-deleted records
  // ---------------------------------------------------------------
  const withDeleted = await api.functional.hrmTimeTracking.guests.index(
    guestConnection,
    {
      body: {
        includeSoftDeleted: true,
        limit: 100,
      } satisfies IHrmTimeTrackingGuest.IRequest,
    },
  );
  typia.assert(withDeleted);
  // ---------------------------------------------------------------
  // 2. Default (without includeSoftDeleted) — excludes soft-deleted
  // ---------------------------------------------------------------
  const withoutDeleted = await api.functional.hrmTimeTracking.guests.index(
    guestConnection,
    {
      body: {
        limit: 100,
      } satisfies IHrmTimeTrackingGuest.IRequest,
    },
  );
  typia.assert(withoutDeleted);
  // The default query should return at most the same records as includeSoftDeleted=true
  TestValidator.predicate(
    "includeSoftDeleted should return >= records than default",
    () => withoutDeleted.pagination.records <= withDeleted.pagination.records,
  );
  // ---------------------------------------------------------------
  // 3. Session count eager-loading
  // ---------------------------------------------------------------
  const withSessions = await api.functional.hrmTimeTracking.guests.index(
    guestConnection,
    {
      body: {
        includeSoftDeleted: true,
        load: { sessionsCount: true },
        limit: 100,
      } satisfies IHrmTimeTrackingGuest.IRequest,
    },
  );
  typia.assert(withSessions);
  // Every returned guest must have a non-negative sessions_count
  for (const guest of withSessions.data) {
    TestValidator.predicate(
      `sessions_count >= 0 for guest ${guest.id}`,
      () => guest.sessions_count >= 0,
    );
  }
  // ---------------------------------------------------------------
  // 4. Sort by device_fingerprint ascending
  // ---------------------------------------------------------------
  const sortedByDevice = await api.functional.hrmTimeTracking.guests.index(
    guestConnection,
    {
      body: {
        sort: "device_fingerprint",
        direction: "asc",
        limit: 100,
      } satisfies IHrmTimeTrackingGuest.IRequest,
    },
  );
  typia.assert(sortedByDevice);
  // Verify ascending alphabetical order
  for (let i: number = 1; i < sortedByDevice.data.length; i++) {
    TestValidator.predicate(
      `device_fingerprint ascending at index ${i}`,
      () =>
        sortedByDevice.data[i - 1].device_fingerprint <=
        sortedByDevice.data[i].device_fingerprint,
    );
  }
  // ---------------------------------------------------------------
  // 5. Sort by created_at ascending (oldest first)
  // ---------------------------------------------------------------
  const sortedByCreatedAt = await api.functional.hrmTimeTracking.guests.index(
    guestConnection,
    {
      body: {
        sort: "created_at",
        direction: "asc",
        limit: 100,
      } satisfies IHrmTimeTrackingGuest.IRequest,
    },
  );
  typia.assert(sortedByCreatedAt);
  // Verify chronological ascending order
  for (let i: number = 1; i < sortedByCreatedAt.data.length; i++) {
    TestValidator.predicate(
      `created_at ascending at index ${i}`,
      () =>
        sortedByCreatedAt.data[i - 1].created_at <=
        sortedByCreatedAt.data[i].created_at,
    );
  }
}
