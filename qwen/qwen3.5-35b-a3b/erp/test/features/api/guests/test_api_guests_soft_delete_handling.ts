import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test soft-delete inclusion filter and comprehensive business logic for guest record retrieval.
 *
 * Validates the complete guest query functionality with soft-delete handling, ensuring that the
 * deleted_at filter properly controls which guest records are returned. The test verifies that
 * default queries return only active guests, queries with deleted_at=true include soft-deleted
 * records, and combined filters (device_identifier, date ranges, sorting) work correctly.
 *
 * Special attention is given to verifying pagination metadata accuracy and edge cases such as
 * empty result sets when no matching criteria exist.
 *
 * 1. Query guests with default behavior (active only, deleted_at omitted)
 * 2. Query guests with deleted_at=true to include soft-deleted records
 * 3. Query with device_identifier filter and deleted_at=true
 * 4. Query with created_at date range and deleted_at=true
 * 5. Query with sorting and deleted_at=true
 * 6. Verify pagination metadata is consistent
 * 7. Test edge case with non-matching device_identifier
 */
export async function test_api_guests_soft_delete_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Query with default behavior (active guests only)
  const activeGuests = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        deleted_at: undefined, // Explicitly omit for active-only
        limit: 5,
      },
    },
  );
  typia.assert(activeGuests);
  // 2. Query with deleted_at=true to include soft-deleted records
  const allGuests = await api.functional.hrmPlatform.guests.index(connection, {
    body: {
      deleted_at: true,
      limit: 5,
    },
  });
  typia.assert(allGuests);
  // 3. Query with device_identifier filter and deleted_at=true
  const deviceIdentifier = RandomGenerator.alphaNumeric(16);
  const deviceFilteredGuests = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        device_identifier: deviceIdentifier,
        deleted_at: true,
        limit: 5,
      },
    },
  );
  typia.assert(deviceFilteredGuests);
  // 4. Query with created_at date range and deleted_at=true
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dateFilteredGuests = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        created_at: {
          gte: sevenDaysAgo.toISOString(),
        },
        deleted_at: true,
        limit: 5,
      },
    },
  );
  typia.assert(dateFilteredGuests);
  // Verify date filtering is applied (all returned guests should be within date range)
  if (dateFilteredGuests.data.length > 0) {
    const withinDateRange = dateFilteredGuests.data.every(
      (guest) => new Date(guest.created_at) >= sevenDaysAgo,
    );
    TestValidator.predicate(
      "guests within created_at date range",
      withinDateRange,
    );
  }
  // 5. Query with sorting and deleted_at=true
  const sortedGuests = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "ASC",
        deleted_at: true,
        limit: 5,
      },
    },
  );
  typia.assert(sortedGuests);
  // Verify sorting is applied when deleted_at=true
  if (sortedGuests.data.length > 1) {
    const isSortedAsc = sortedGuests.data.every(
      (guest, index) =>
        index === 0 ||
        guest.created_at >= sortedGuests.data[index - 1].created_at,
    );
    TestValidator.predicate(
      "guests sorted ascending by created_at",
      isSortedAsc,
    );
  }
  // 6. Test edge case: non-matching device_identifier
  const nonMatchingGuests = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        device_identifier: "non-matching-device-id-12345",
        deleted_at: true,
        limit: 5,
      },
    },
  );
  typia.assert(nonMatchingGuests);
  TestValidator.equals(
    "non-matching device returns empty array",
    nonMatchingGuests.data.length,
    0,
  );
  TestValidator.equals(
    "empty result has zero records",
    nonMatchingGuests.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages",
    nonMatchingGuests.pagination.pages,
    0,
  );
  // 7. Verify pagination structure is consistent with default query
  TestValidator.predicate(
    "limit within bounds",
    activeGuests.pagination.limit >= 1 && activeGuests.pagination.limit <= 100,
  );
  TestValidator.equals(
    "limit matches request",
    activeGuests.pagination.limit,
    5,
  );
  TestValidator.equals(
    "current page is 1",
    activeGuests.pagination.current,
    1,
  );
  // 8. Test page parameter with deleted_at filter
  const page2Guests = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        deleted_at: true,
        limit: 5,
        page: 2,
      },
    },
  );
  typia.assert(page2Guests);
  TestValidator.equals(
    "page 2 has correct current",
    page2Guests.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit is still 5",
    page2Guests.pagination.limit,
    5,
  );
  // 9. Compare active vs all guests counts
  TestValidator.predicate(
    "all guests count >= active guests count",
    allGuests.pagination.records >= activeGuests.pagination.records,
  );
}