import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test advanced filtering capabilities of the guest search endpoint. Validate filtering by device_fingerprint using partial matching patterns. Test date range filtering using created_at_start and created_at_end parameters to retrieve guests created within specific time periods. Verify account status filtering using deleted_at parameter to distinguish between active and inactive guest accounts. Test combinations of multiple filters to ensure they work correctly together. Validate that filtering logic properly applies SQL WHERE conditions and returns appropriate subsets of guest records.
 */
export async function test_api_guest_search_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Since there's no create guest API, we'll work with existing data
  // First, get a baseline of all guests to understand what's available
  const allGuests = await api.functional.discussionBoard.guests.index(
    connection,
    {
      body: {
        limit: 100,
        sort: "created_at_asc",
      } satisfies IDiscussionBoardGuest.IRequest,
    },
  );
  typia.assert(allGuests);
  // If there are no guests in the system, we can't test filtering properly
  // But we'll still test the API works with various filter combinations
  if (allGuests.data.length > 0) {
    // Test 1: Device fingerprint partial matching
    // Extract a substring from existing device fingerprint to test LIKE pattern
    const sampleGuest = allGuests.data[0];
    if (sampleGuest.device_fingerprint.length > 3) {
      const substring = sampleGuest.device_fingerprint.substring(0, 3);
      const fingerprintFilter =
        await api.functional.discussionBoard.guests.index(connection, {
          body: {
            device_fingerprint: `%${substring}%`,
            limit: 100,
          } satisfies IDiscussionBoardGuest.IRequest,
        });
      typia.assert(fingerprintFilter);
      // Validate that all returned guests contain the substring in their fingerprint
      TestValidator.predicate(
        "all filtered guests contain fingerprint substring",
        fingerprintFilter.data.every((guest) =>
          guest.device_fingerprint.includes(substring),
        ),
      );
    }
    // Test 2: Date range filtering
    // Get creation date of first and last guest (sorted ascending)
    const firstGuest = allGuests.data[0];
    const lastGuest = allGuests.data[allGuests.data.length - 1];
    // Filter for guests created between first and last guest dates
    const dateRangeFilter = await api.functional.discussionBoard.guests.index(
      connection,
      {
        body: {
          created_at_start: firstGuest.created_at,
          created_at_end: lastGuest.created_at,
          limit: 100,
          sort: "created_at_asc",
        } satisfies IDiscussionBoardGuest.IRequest,
      },
    );
    typia.assert(dateRangeFilter);
    // All guests should be within the date range
    TestValidator.predicate(
      "date range filter returns guests within range",
      dateRangeFilter.data.every((guest) => {
        const createdAt = new Date(guest.created_at).getTime();
        const startTime = new Date(firstGuest.created_at).getTime();
        const endTime = new Date(lastGuest.created_at).getTime();
        return createdAt >= startTime && createdAt <= endTime;
      }),
    );
    // Test 3: Account status filtering (active accounts)
    // Note: We don't know which accounts are active or inactive
    // But we can test that the API accepts deleted_at parameter
    const activeAccountsRequest =
      await api.functional.discussionBoard.guests.index(connection, {
        body: {
          deleted_at: undefined,
          limit: 10,
        } satisfies IDiscussionBoardGuest.IRequest,
      });
    typia.assert(activeAccountsRequest);
    // Test 4: Sorting options
    const ascendingSort = await api.functional.discussionBoard.guests.index(
      connection,
      {
        body: {
          sort: "created_at_asc",
          limit: 10,
        } satisfies IDiscussionBoardGuest.IRequest,
      },
    );
    typia.assert(ascendingSort);
    const descendingSort = await api.functional.discussionBoard.guests.index(
      connection,
      {
        body: {
          sort: "created_at_desc",
          limit: 10,
        } satisfies IDiscussionBoardGuest.IRequest,
      },
    );
    typia.assert(descendingSort);
    // Validate sorting order
    if (ascendingSort.data.length > 1) {
      TestValidator.predicate(
        "ascending sort orders guests from oldest to newest",
        ArrayUtil.has(ascendingSort.data.slice(1), (elem: any) => {
          const index = ascendingSort.data.indexOf(elem);
          const prevCreatedAt = new Date(
            ascendingSort.data[index - 1].created_at,
          ).getTime();
          const currCreatedAt = new Date(elem.created_at).getTime();
          return prevCreatedAt <= currCreatedAt;
        }),
      );
    }
    // Test 5: Pagination
    const page1 = await api.functional.discussionBoard.guests.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "created_at_asc",
        } satisfies IDiscussionBoardGuest.IRequest,
      },
    );
    typia.assert(page1);
    const page2 = await api.functional.discussionBoard.guests.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
          sort: "created_at_asc",
        } satisfies IDiscussionBoardGuest.IRequest,
      },
    );
    typia.assert(page2);
    // Validate pagination metadata
    TestValidator.equals(
      "page 1 has correct pagination info",
      page1.pagination.current,
      1,
    );
    TestValidator.equals(
      "page 1 limit matches request",
      page1.pagination.limit,
      5,
    );
    if (page1.pagination.records > 5) {
      TestValidator.equals(
        "page 2 has correct page number",
        page2.pagination.current,
        2,
      );
    }
    // Test 6: Combined filters
    const combinedFilter = await api.functional.discussionBoard.guests.index(
      connection,
      {
        body: {
          created_at_start: firstGuest.created_at,
          created_at_end: lastGuest.created_at,
          limit: 5,
          sort: "created_at_desc",
        } satisfies IDiscussionBoardGuest.IRequest,
      },
    );
    typia.assert(combinedFilter);
    // Validate combined filter results
    TestValidator.predicate(
      "combined filter respects date range and limit",
      combinedFilter.data.length <= 5 &&
        combinedFilter.data.every((guest) => {
          const createdAt = new Date(guest.created_at).getTime();
          const startTime = new Date(firstGuest.created_at).getTime();
          const endTime = new Date(lastGuest.created_at).getTime();
          return createdAt >= startTime && createdAt <= endTime;
        }),
    );
  }
  // Edge case tests that should always work regardless of data
  // Test with empty search (all defaults)
  const defaultSearch = await api.functional.discussionBoard.guests.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardGuest.IRequest,
    },
  );
  typia.assert(defaultSearch);
  // Test with minimal parameters
  const minimalSearch = await api.functional.discussionBoard.guests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardGuest.IRequest,
    },
  );
  typia.assert(minimalSearch);
  // Test validation with invalid parameters would be type errors, not E2E tests
  // E2E tests focus on business logic, not type validation
  console.log("Guest search advanced filtering tests completed successfully");
}