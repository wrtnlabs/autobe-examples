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
 * Test guest listing with creation date range filtering.
 *
 * This test verifies the temporal filtering behavior of the guest listing endpoint:
 * 1. created_at_from filters guests created on or after the specified timestamp
 * 2. created_at_to filters guests created on or before the specified timestamp
 * 3. Combined date range returns only guests within the specified period
 * 4. Edge cases: future date ranges return empty, pagination metadata reflects filtered count
 */
export async function test_api_guest_listing_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Get baseline: retrieve all guests to understand existing data
  const allGuests = await api.functional.hrmPlatform.guests.index(connection, {
    body: {
      page: 1,
      limit: 100,
    } satisfies IHrmPlatformGuest.IRequest,
  });
  typia.assert(allGuests);
  // Test 1: Future date range should return empty results
  const now = new Date();
  const futureDate = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureFilter = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        created_at_from: futureDate,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformGuest.IRequest,
    },
  );
  typia.assert(futureFilter);
  TestValidator.equals(
    "future date range returns empty",
    futureFilter.data.length,
    0,
  );
  TestValidator.equals(
    "future filter pagination records",
    futureFilter.pagination.records,
    0,
  );
  // Test 2: Filter with created_at_from (guests created on or after timestamp)
  const pastWeek = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const fromFilter = await api.functional.hrmPlatform.guests.index(connection, {
    body: {
      created_at_from: pastWeek,
      page: 1,
      limit: 100,
    } satisfies IHrmPlatformGuest.IRequest,
  });
  typia.assert(fromFilter);
  // Validate all returned guests were created on or after the from date
  for (const guest of fromFilter.data) {
    TestValidator.predicate(
      "guest created_at >= from date",
      () =>
        new Date(guest.created_at).getTime() >= new Date(pastWeek).getTime(),
    );
  }
  // Test 3: Filter with created_at_to (guests created on or before timestamp)
  const twoWeeksAgo = new Date(
    now.getTime() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const toFilter = await api.functional.hrmPlatform.guests.index(connection, {
    body: {
      created_at_to: twoWeeksAgo,
      page: 1,
      limit: 100,
    } satisfies IHrmPlatformGuest.IRequest,
  });
  typia.assert(toFilter);
  // Validate all returned guests were created on or before the to date
  for (const guest of toFilter.data) {
    TestValidator.predicate(
      "guest created_at <= to date",
      () =>
        new Date(guest.created_at).getTime() <= new Date(twoWeeksAgo).getTime(),
    );
  }
  // Test 4: Combined date range filtering (guests within specific period)
  const rangeFrom = new Date(
    now.getTime() - 10 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const rangeTo = new Date(
    now.getTime() - 3 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const rangeFilter = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        created_at_from: rangeFrom,
        created_at_to: rangeTo,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformGuest.IRequest,
    },
  );
  typia.assert(rangeFilter);
  // Validate all returned guests fall within the date range
  for (const guest of rangeFilter.data) {
    const guestTime = new Date(guest.created_at).getTime();
    const fromTime = new Date(rangeFrom).getTime();
    const toTime = new Date(rangeTo).getTime();
    TestValidator.predicate(
      "guest created_at within combined range",
      () => guestTime >= fromTime && guestTime <= toTime,
    );
  }
  // Test 5: Verify pagination metadata reflects filtered count
  TestValidator.equals(
    "pagination records matches filtered data length",
    rangeFilter.pagination.records,
    rangeFilter.data.length,
  );
  // Test 6: Single-day range filtering
  const singleDay = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const dayStart = new Date(singleDay.setHours(0, 0, 0, 0)).toISOString();
  const dayEnd = new Date(singleDay.setHours(23, 59, 59, 999)).toISOString();
  const singleDayFilter = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        created_at_from: dayStart,
        created_at_to: dayEnd,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformGuest.IRequest,
    },
  );
  typia.assert(singleDayFilter);
  // Validate pagination metadata for single-day filter
  TestValidator.equals(
    "single-day pagination records matches data length",
    singleDayFilter.pagination.records,
    singleDayFilter.data.length,
  );
}
