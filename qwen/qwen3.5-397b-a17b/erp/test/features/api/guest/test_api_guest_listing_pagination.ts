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
 * Test guest listing pagination functionality.
 *
 * Verifies that the PATCH /hrmPlatform/guests endpoint returns properly
 * paginated guest account lists with correct metadata and sorting.
 * Tests default pagination parameters and validates response structure.
 */
export async function test_api_guest_listing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test default pagination (page=1, limit=20)
  const result = await api.functional.hrmPlatform.guests.index(connection, {
    body: {
      page: 1,
      limit: 20,
    } satisfies IHrmPlatformGuest.IRequest,
  });
  // Validate response structure - typia.assert performs complete type validation
  typia.assert(result);
  // Validate pagination metadata business logic
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  // Validate sorting order (created_at descending - most recent first)
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      const prevDate = new Date(result.data[i - 1].created_at).getTime();
      const currDate = new Date(result.data[i].created_at).getTime();
      TestValidator.predicate(
        `guests sorted by created_at descending (index ${i - 1} vs ${i})`,
        prevDate >= currDate,
      );
    }
  }
  // Validate pagination consistency
  const expectedPages =
    result.pagination.records === 0
      ? 0
      : Math.ceil(result.pagination.records / result.pagination.limit);
  TestValidator.equals(
    "pages calculation",
    result.pagination.pages,
    expectedPages,
  );
  // Validate data count doesn't exceed limit
  TestValidator.predicate(
    "data length within limit",
    result.data.length <= result.pagination.limit,
  );
  // Test with custom pagination parameters
  const customResult = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IHrmPlatformGuest.IRequest,
    },
  );
  typia.assert(customResult);
  TestValidator.equals(
    "custom current page",
    customResult.pagination.current,
    2,
  );
  TestValidator.equals("custom limit", customResult.pagination.limit, 10);
  // Test with search parameter
  const searchResult = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        search: "test",
        page: 1,
        limit: 15,
      } satisfies IHrmPlatformGuest.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.equals(
    "search current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("search limit", searchResult.pagination.limit, 15);
  // Test with date range filter
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResult = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        created_at_from: thirtyDaysAgo.toISOString(),
        created_at_to: now.toISOString(),
        page: 1,
        limit: 25,
      } satisfies IHrmPlatformGuest.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range current page",
    dateRangeResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "date range limit",
    dateRangeResult.pagination.limit,
    25,
  );
  // Validate all returned guests fall within date range (business logic validation)
  for (const guest of dateRangeResult.data) {
    const guestDate = new Date(guest.created_at).getTime();
    TestValidator.predicate(
      "guest created_at within range",
      guestDate >= thirtyDaysAgo.getTime() && guestDate <= now.getTime(),
    );
  }
}
