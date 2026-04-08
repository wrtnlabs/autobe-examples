import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guests_filter_by_date_and_deletion_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for accessing guest management endpoints
  const adminConnection: api.IConnection = { host: connection.host };
  // Test 1: Query with date range filters only
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateRangeResult = await api.functional.todoApp.guests.index(
    adminConnection,
    {
      body: {
        created_at_gte: oneDayAgo.toISOString(),
        created_at_lte: oneWeekFromNow.toISOString(),
        page: 1,
        limit: 20,
      } satisfies ITodoAppGuest.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  // Verify pagination metadata exists
  TestValidator.predicate(
    "pagination exists",
    dateRangeResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    dateRangeResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    dateRangeResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    dateRangeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    dateRangeResult.pagination.pages >= 0,
  );
  // Test 2: Query with deleted_at=null (only active guests)
  const activeGuestsResult = await api.functional.todoApp.guests.index(
    adminConnection,
    {
      body: {
        deleted_at: null,
        page: 1,
        limit: 20,
      } satisfies ITodoAppGuest.IRequest,
    },
  );
  typia.assert(activeGuestsResult);
  // Verify all returned guests are active (deleted_at is null)
  await ArrayUtil.asyncForEach(activeGuestsResult.data, async (guest) => {
    TestValidator.predicate("guest is active", guest.deleted_at === null);
  });
  // Test 3: Query with deleted_at set (only deleted guests)
  const deletedGuestsResult = await api.functional.todoApp.guests.index(
    adminConnection,
    {
      body: {
        deleted_at: now.toISOString(),
        page: 1,
        limit: 20,
      } satisfies ITodoAppGuest.IRequest,
    },
  );
  typia.assert(deletedGuestsResult);
  // Verify all returned guests are deleted (deleted_at is not null)
  await ArrayUtil.asyncForEach(deletedGuestsResult.data, async (guest) => {
    TestValidator.predicate("guest is deleted", guest.deleted_at !== null);
  });
  // Test 4: Query with both date range and deletion status filters combined
  const combinedFilterResult = await api.functional.todoApp.guests.index(
    adminConnection,
    {
      body: {
        created_at_gte: oneDayAgo.toISOString(),
        created_at_lte: oneWeekFromNow.toISOString(),
        deleted_at: null,
        page: 1,
        limit: 20,
      } satisfies ITodoAppGuest.IRequest,
    },
  );
  typia.assert(combinedFilterResult);
  // Verify all returned guests match both criteria
  await ArrayUtil.asyncForEach(combinedFilterResult.data, async (guest) => {
    const createdAt = new Date(guest.created_at);
    TestValidator.predicate(
      "guest created within date range",
      createdAt >= oneDayAgo && createdAt <= oneWeekFromNow,
    );
    TestValidator.predicate("guest is active", guest.deleted_at === null);
  });
  // Test 5: Test with different pagination parameters
  const paginatedResult = await api.functional.todoApp.guests.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies ITodoAppGuest.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "current page is 2",
    paginatedResult.pagination.current,
    2,
  );
  TestValidator.equals("limit is 10", paginatedResult.pagination.limit, 10);
  // Test 6: Test with sorting parameters
  const sortedResult = await api.functional.todoApp.guests.index(
    adminConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppGuest.IRequest,
    },
  );
  typia.assert(sortedResult);
  // Verify sorting is ascending by created_at
  if (sortedResult.data.length > 1) {
    for (let i = 1; i < sortedResult.data.length; i++) {
      const prevDate = new Date(sortedResult.data[i - 1].created_at);
      const currDate = new Date(sortedResult.data[i].created_at);
      TestValidator.predicate(
        `guest ${i} created after guest ${i - 1}`,
        currDate >= prevDate,
      );
    }
  }
  // Test 7: Test with device fingerprint filter
  const fingerprintResult = await api.functional.todoApp.guests.index(
    adminConnection,
    {
      body: {
        device_fingerprint: "test",
        page: 1,
        limit: 20,
      } satisfies ITodoAppGuest.IRequest,
    },
  );
  typia.assert(fingerprintResult);
  // Verify all returned guests have device fingerprint containing "test"
  await ArrayUtil.asyncForEach(fingerprintResult.data, async (guest) => {
    TestValidator.predicate(
      "device fingerprint contains 'test'",
      guest.device_fingerprint.toLowerCase().includes("test"),
    );
  });
  // Test 8: Test empty result set scenario with impossible date range
  const emptyResult = await api.functional.todoApp.guests.index(
    adminConnection,
    {
      body: {
        created_at_gte: "2050-01-01T00:00:00Z",
        created_at_lte: "2050-12-31T23:59:59Z",
        page: 1,
        limit: 20,
      } satisfies ITodoAppGuest.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Verify empty result set has correct pagination metadata
  TestValidator.equals(
    "empty result has 0 records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has 0 pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has empty data array",
    emptyResult.data.length,
    0,
  );
}
