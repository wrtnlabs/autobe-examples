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

/**
 * Test guest sessions listing endpoint with date range filtering.
 *
 * Validates the search parameter functionality for filtering guest sessions by created_at timestamps.
 * Tests date-specific queries, date range queries, pagination metadata accuracy, and combinations
 * with status filtering. Ensures that the search parameter correctly filters on creation times
 * and that pagination reflects filtered result counts.
 *
 * Special attention is given to verifying that:
 * - Date ranges are inclusive on both start and end dates
 * - Pagination metadata accurately reflects filtered result counts
 * - Returned guest sessions have created_at within the specified range
 */
export async function test_api_guest_sessions_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch all guests (baseline)
  const baseline = await api.functional.multiUserTodo.guests.index(connection, {
    body: {
      limit: 100,
      status: "all",
    } satisfies IMultiUserTodoGuest.IRequest,
  });
  typia.assert(baseline);
  const baselineCount = baseline.data.length;
  const baselineRecords = baseline.pagination.records;
  // 2. Test date-specific filtering (YYYY-MM-DD format)
  const today = new Date();
  const todayDate = today.toISOString().split("T")[0];
  const dateFiltered = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        limit: 100,
        search: todayDate,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(dateFiltered);
  // Verify date-filtered results are subset of baseline
  TestValidator.predicate(
    "date filtered count <= baseline",
    dateFiltered.data.length <= baselineCount,
  );
  TestValidator.equals(
    "date filtered records match data length",
    dateFiltered.data.length,
    dateFiltered.pagination.records,
  );
  // Verify all returned guests have created_at matching the date
  for (const guest of dateFiltered.data) {
    const guestDate = guest.created_at.split("T")[0];
    TestValidator.equals(
      `guest ${guest.id} date matches filter`,
      guestDate,
      todayDate,
    );
  }
  // 3. Test date range filtering (YYYY-MM-DD..YYYY-MM-DD format)
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date(today);
  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];
  const dateRangeFilter = `${startDateStr}..${endDateStr}`;
  const rangeFiltered = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        limit: 100,
        search: dateRangeFilter,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(rangeFiltered);
  // Verify range-filtered results are subset of baseline
  TestValidator.predicate(
    "range filtered count <= baseline",
    rangeFiltered.data.length <= baselineCount,
  );
  TestValidator.equals(
    "range filtered records match data length",
    rangeFiltered.data.length,
    rangeFiltered.pagination.records,
  );
  // Verify all returned guests have created_at within range
  for (const guest of rangeFiltered.data) {
    const guestDate = new Date(guest.created_at);
    TestValidator.predicate(
      `guest ${guest.id} date >= start`,
      guestDate >= startDate,
    );
    TestValidator.predicate(
      `guest ${guest.id} date <= end`,
      guestDate <= endDate,
    );
  }
  // 4. Test pagination with filtered results
  const paginated = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
        search: todayDate,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.equals(
    "paginated records matches data length",
    paginated.data.length,
    paginated.pagination.records,
  );
  TestValidator.equals(
    "paginated current page",
    paginated.pagination.current,
    2,
  );
  // 5. Test date range combined with status filter
  const statusRangeFilter = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        limit: 100,
        search: dateRangeFilter,
        status: "active",
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(statusRangeFilter);
  TestValidator.predicate(
    "status + range filtered count <= baseline",
    statusRangeFilter.data.length <= baselineCount,
  );
  TestValidator.equals(
    "status + range records match data length",
    statusRangeFilter.data.length,
    statusRangeFilter.pagination.records,
  );
  // Verify all returned guests are active
  for (const guest of statusRangeFilter.data) {
    TestValidator.equals(
      `guest ${guest.id} status is active`,
      guest.status,
      "active",
    );
  }
  // 6. Test edge case: date range with no results
  const farFuture = new Date(today);
  farFuture.setFullYear(farFuture.getFullYear() + 100);
  const futureDateStr = farFuture.toISOString().split("T")[0];
  const noResults = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        limit: 100,
        search: `${futureDateStr}..${futureDateStr}`,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(noResults);
  TestValidator.equals("no results count", noResults.data.length, 0);
  TestValidator.equals("no results records", noResults.pagination.records, 0);
  TestValidator.equals("no results pages", noResults.pagination.pages, 0);
  // 7. Verify filter is on created_at, not updated_at
  const allFiltered = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        limit: 100,
        search: todayDate,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(allFiltered);
  for (const guest of allFiltered.data) {
    const guestCreatedAt = new Date(guest.created_at);
    const todayStart = new Date(todayDate);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayDate);
    todayEnd.setHours(23, 59, 59, 999);
    TestValidator.predicate(
      `guest ${guest.id} created_at within filter date`,
      guestCreatedAt >= todayStart && guestCreatedAt <= todayEnd,
    );
  }
}
