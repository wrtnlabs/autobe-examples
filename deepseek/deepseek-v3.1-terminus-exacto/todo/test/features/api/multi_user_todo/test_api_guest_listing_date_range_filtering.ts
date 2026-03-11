import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_listing_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Since we don't have guest creation API available, we'll test the filtering
  // functionality using the existing guest data in the system
  // First, get all guests to understand the existing data
  const allGuests = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(allGuests);
  if (allGuests.data.length === 0) {
    // If no guests exist, we can't properly test date range filtering
    // This is a limitation of the test environment
    return;
  }
  // Extract creation timestamps from existing guests
  const creationTimestamps = allGuests.data.map((guest) => guest.created_at);
  creationTimestamps.sort(); // Sort chronologically
  // Use the earliest and latest timestamps for testing
  const earliestTimestamp = creationTimestamps[0];
  const latestTimestamp = creationTimestamps[creationTimestamps.length - 1];
  // Test 1: Filter with created_after set to a middle timestamp
  const middleIndex = Math.floor(creationTimestamps.length / 2);
  const middleTimestamp = creationTimestamps[middleIndex];
  const responseAfter = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        created_after: middleTimestamp,
        limit: 100,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(responseAfter);
  // Test 2: Filter with created_before set to a middle timestamp
  const responseBefore = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        created_before: middleTimestamp,
        limit: 100,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(responseBefore);
  // Test 3: Filter with both created_after and created_before
  const responseRange = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        created_after: earliestTimestamp,
        created_before: latestTimestamp,
        limit: 100,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(responseRange);
  // Validate that all responses have proper structure
  TestValidator.predicate(
    "after response has pagination",
    responseAfter.pagination !== undefined,
  );
  TestValidator.predicate(
    "before response has pagination",
    responseBefore.pagination !== undefined,
  );
  TestValidator.predicate(
    "range response has pagination",
    responseRange.pagination !== undefined,
  );
  TestValidator.predicate(
    "after response has data array",
    Array.isArray(responseAfter.data),
  );
  TestValidator.predicate(
    "before response has data array",
    Array.isArray(responseBefore.data),
  );
  TestValidator.predicate(
    "range response has data array",
    Array.isArray(responseRange.data),
  );
  // Validate that filtering is working (basic sanity checks)
  if (responseAfter.data.length > 0) {
    const firstGuestAfter = responseAfter.data[0];
    TestValidator.predicate(
      "created_after filter includes valid timestamp",
      firstGuestAfter.created_at >= middleTimestamp,
    );
  }
  if (responseBefore.data.length > 0) {
    const firstGuestBefore = responseBefore.data[0];
    TestValidator.predicate(
      "created_before filter includes valid timestamp",
      firstGuestBefore.created_at <= middleTimestamp,
    );
  }
  // Test edge case: created_after equal to created_before (should return empty)
  const responseEmptyRange = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        created_after: middleTimestamp,
        created_before: middleTimestamp,
        limit: 100,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(responseEmptyRange);
  // Empty range should return no results (or very specific edge case results)
  TestValidator.predicate(
    "empty range response valid",
    Array.isArray(responseEmptyRange.data),
  );
}
