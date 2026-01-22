import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListGuest";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
export async function test_api_guest_sessions_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Get baseline data: all guest sessions
  const allSessions = await api.functional.todoList.guests.index(connection, {
    body: {
      page: 1,
      limit: 100,
    },
  });
  typia.assert(allSessions);
  // Test 1: Basic pagination - verify page size and total records
  const smallPageResult = await api.functional.todoList.guests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      },
    },
  );
  typia.assert(smallPageResult);
  TestValidator.equals(
    "pagination limit should be 5",
    smallPageResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination page should be 1",
    smallPageResult.pagination.current,
    1,
  );
  // Test 2: Verify that total records matches what we have
  TestValidator.equals(
    "total records should be consistent",
    smallPageResult.pagination.records,
    allSessions.pagination.records,
  );
  // Test 3: Test search by ID (since ipAddress is not available in ISummary)
  if (allSessions.data.length > 0) {
    const sampleSession = allSessions.data[0];
    const idSubstr = sampleSession.id.substring(0, 5);
    const searchSessions = await api.functional.todoList.guests.index(
      connection,
      {
        body: {
          search: idSubstr,
          page: 1,
          limit: 50,
        },
      },
    );
    typia.assert(searchSessions);
    TestValidator.predicate(
      "search should return at least one matching session",
      () => searchSessions.data.length > 0,
    );
    TestValidator.predicate("all search results contain the substring", () =>
      searchSessions.data.every((session) => session.id.includes(idSubstr)),
    );
  }
  // Test 4: Testing creation time filtering
  if (allSessions.data.length >= 2) {
    // Sort by creation time to get earliest and latest
    const sortedByCreation = [...allSessions.data].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const earliestDate = sortedByCreation[0].createdAt;
    const latestDate = sortedByCreation[sortedByCreation.length - 1].createdAt;
    // Filter sessions created after the earliest date
    const afterEarliest = await api.functional.todoList.guests.index(
      connection,
      {
        body: {
          createdAtStart: earliestDate,
          page: 1,
          limit: 50,
        },
      },
    );
    typia.assert(afterEarliest);
    TestValidator.equals(
      "all sessions after earliest date",
      afterEarliest.pagination.records,
      allSessions.pagination.records,
    );
    // Filter sessions created before the latest date
    const beforeLatest = await api.functional.todoList.guests.index(
      connection,
      {
        body: {
          createdAtEnd: latestDate,
          page: 1,
          limit: 50,
        },
      },
    );
    typia.assert(beforeLatest);
    TestValidator.equals(
      "all sessions before latest date",
      beforeLatest.pagination.records,
      allSessions.pagination.records,
    );
  }
  // Test 5: Sort by createdAt ascending
  if (allSessions.data.length > 1) {
    const sortCreatedAtAsc = await api.functional.todoList.guests.index(
      connection,
      {
        body: {
          orderBy: "createdAt",
          orderDirection: "asc",
          page: 1,
          limit: 50,
        },
      },
    );
    typia.assert(sortCreatedAtAsc);
    // Sort a copy of the data manually for validation
    const manuallySorted = [...allSessions.data].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    TestValidator.index(
      "sessions sorted by createdAt ascending",
      manuallySorted,
      sortCreatedAtAsc.data,
    );
  }
  // Test 6: Sort by createdAt descending
  if (allSessions.data.length > 1) {
    const sortCreatedAtDesc = await api.functional.todoList.guests.index(
      connection,
      {
        body: {
          orderBy: "createdAt",
          orderDirection: "desc",
          page: 1,
          limit: 50,
        },
      },
    );
    typia.assert(sortCreatedAtDesc);
    // Sort a copy of the data manually for validation
    const manuallySorted = [...allSessions.data].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    TestValidator.index(
      "sessions sorted by createdAt descending",
      manuallySorted,
      sortCreatedAtDesc.data,
    );
  }
  // Test 7: Test pagination across pages
  if (allSessions.pagination.records > 5) {
    const limit = 2;
    const totalPages = Math.ceil(allSessions.pagination.records / limit);
    const allPagesData: ITodoListGuest.ISummary[] = [];
    for (let page = 1; page <= Math.min(totalPages, 5); page++) {
      const pageResult = await api.functional.todoList.guests.index(
        connection,
        {
          body: {
            page,
            limit,
          },
        },
      );
      typia.assert(pageResult);
      allPagesData.push(...pageResult.data);
      // Verify each page has limit items (except potentially last)
      const expectedCount =
        page === totalPages
          ? allSessions.pagination.records % limit || limit
          : limit;
      TestValidator.equals(
        `page ${page} should have ${expectedCount} items`,
        pageResult.data.length,
        expectedCount,
      );
    }
    // Verify pagination covers all records correctly
    TestValidator.equals(
      "total pages schema matches",
      allSessions.pagination.pages,
      totalPages,
    );
    TestValidator.predicate(
      "all pages data equals total records",
      () => allPagesData.length >= allSessions.pagination.records,
    );
  }
  // Test 8: Ensure empty result for impossible filters
  // Simulate non-existent data
  const impossibleStartDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString(); // 30 days ahead
  const impossibleEndDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 31,
  ).toISOString(); // 31 days ahead
  const impossibleResult = await api.functional.todoList.guests.index(
    connection,
    {
      body: {
        createdAtStart: impossibleStartDate,
        createdAtEnd: impossibleEndDate,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(impossibleResult);
  TestValidator.equals(
    "impossible creation date range should return empty",
    impossibleResult.data.length,
    0,
  );
  // Test 9: Test that required parameters are optional (default behavior)
  // If no filters, should return all sessions
  const noFilters = await api.functional.todoList.guests.index(connection, {
    body: {},
  });
  typia.assert(noFilters);
  TestValidator.equals(
    "no filters should return all sessions",
    noFilters.pagination.records,
    allSessions.pagination.records,
  );
  // Test 10: Test default pagination
  const defaultLimit = await api.functional.todoList.guests.index(connection, {
    body: { page: 1 },
  });
  typia.assert(defaultLimit);
  TestValidator.equals(
    "default limit should be 20",
    defaultLimit.pagination.limit,
    20,
  );
}
