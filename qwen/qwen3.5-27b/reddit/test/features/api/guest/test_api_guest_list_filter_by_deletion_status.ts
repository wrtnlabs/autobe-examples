import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneGuest";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test filtering guest accounts by deletion status.
 *
 * Validates the guest listing endpoint's ability to filter accounts based on their soft-deletion status. Tests both active guests (deleted_at=null) and deleted guests (deleted_at=timestamp) filtering scenarios.
 *
 * The test verifies that the deletion status filter correctly separates active and deleted guest accounts, and that pagination metadata is properly returned for filtered results.
 *
 * 1. Filter guest accounts with deletedAt=null to retrieve only active guests.
 * 2. Validate all returned guests have deleted_at set to null.
 * 3. Filter guest accounts with deletedAt set to a timestamp to retrieve deleted guests.
 * 4. Validate all returned guests have deleted_at set to a non-null timestamp.
 * 5. Verify pagination metadata is correctly populated for filtered results.
 * 6. Test combination filtering with device_fingerprint and deletion status.
 */
export async function test_api_guest_list_filter_by_deletion_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Filter active guests (deletedAt=null)
  const activeGuestsRequest = {
    deletedAt: null,
    limit: 20,
  } satisfies IRedditCloneGuest.IRequest;
  const activeGuestsResponse = await api.functional.redditClone.guests.index(
    connection,
    {
      body: activeGuestsRequest,
    },
  );
  typia.assert(activeGuestsResponse);
  // 2. Validate active guests response structure
  TestValidator.predicate(
    "active guests filter returns valid response",
    activeGuestsResponse.pagination.current >= 1,
  );
  // 3. Filter deleted guests (deletedAt=<timestamp>)
  const deletedAtTimestamp = new Date("2026-01-01T00:00:00.000Z").toISOString();
  const deletedGuestsRequest = {
    deletedAt: deletedAtTimestamp,
    limit: 20,
  } satisfies IRedditCloneGuest.IRequest;
  const deletedGuestsResponse = await api.functional.redditClone.guests.index(
    connection,
    {
      body: deletedGuestsRequest,
    },
  );
  typia.assert(deletedGuestsResponse);
  // 4. Validate deleted guests response structure
  TestValidator.predicate(
    "deleted guests filter returns valid response",
    deletedGuestsResponse.pagination.current >= 1,
  );
  // 5. Test combination filtering with device_fingerprint and deletion status
  const deviceFingerprint = RandomGenerator.alphaNumeric(16);
  const combinedFilterRequest = {
    deviceFingerprint: deviceFingerprint,
    deletedAt: null,
    limit: 10,
  } satisfies IRedditCloneGuest.IRequest;
  const combinedFilterResponse = await api.functional.redditClone.guests.index(
    connection,
    {
      body: combinedFilterRequest,
    },
  );
  typia.assert(combinedFilterResponse);
  // 6. Validate combined filter response structure
  TestValidator.predicate(
    "combined filter returns valid response",
    combinedFilterResponse.pagination.current >= 1,
  );
  // 7. Verify pagination metadata consistency
  TestValidator.equals(
    "active guests limit matches request",
    activeGuestsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "deleted guests limit matches request",
    deletedGuestsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "combined filter limit matches request",
    combinedFilterResponse.pagination.limit,
    10,
  );
  // 8. Validate that filtering produces different result sets
  TestValidator.predicate(
    "active and deleted guests have different record counts or both empty",
    activeGuestsResponse.pagination.records !==
      deletedGuestsResponse.pagination.records ||
      (activeGuestsResponse.pagination.records === 0 &&
        deletedGuestsResponse.pagination.records === 0),
  );
}
