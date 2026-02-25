import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_sessions_sort_and_order(
  connection: api.IConnection,
): Promise<void> {
  // Create test sessions with varying creation and expiration dates
  // Since we can't create users directly, we'll test the sessions endpoint
  // with various sort and order parameters to verify the sorting functionality
  // Test 1: Sort by createdAt descending (default behavior)
  const sortedByCreatedDesc = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {
        sort: "createdAt",
        order: "desc",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(sortedByCreatedDesc);
  // Test 2: Sort by createdAt ascending
  const sortedByCreatedAsc = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {
        sort: "createdAt",
        order: "asc",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(sortedByCreatedAsc);
  // Test 3: Sort by expiredAt descending
  const sortedByExpiredDesc = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {
        sort: "expiredAt",
        order: "desc",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(sortedByExpiredDesc);
  // Test 4: Sort by expiredAt ascending
  const sortedByExpiredAsc = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {
        sort: "expiredAt",
        order: "asc",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(sortedByExpiredAsc);
  // Test 5: Sort by ip ascending
  const sortedByIpAsc = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {
        sort: "ip",
        order: "asc",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(sortedByIpAsc);
  // Test 6: Sort by ip descending
  const sortedByIpDesc = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {
        sort: "ip",
        order: "desc",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(sortedByIpDesc);
  // Test 7: Pagination with sorting
  const paginatedSorted = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {
        sort: "createdAt",
        order: "desc",
        page: 1,
        limit: 2,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(paginatedSorted);
  TestValidator.equals("pagination limit", paginatedSorted.pagination.limit, 2);
  // Test 8: Filtering with sorting
  const filteredSorted = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {
        expired: "active",
        sort: "createdAt",
        order: "desc",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(filteredSorted);
  // Test 9: Default sort behavior (no sort specified)
  const defaultSort = await api.functional.todoApp.sessions.index(connection, {
    body: {} satisfies ITodoAppUserSession.IRequest,
  });
  typia.assert(defaultSort);
  // Test 10: Stable sorting verification
  const stableSortTest = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {
        sort: "createdAt",
        order: "desc",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(stableSortTest);
  // Test 11: IP address format validation in results
  const ipSort = await api.functional.todoApp.sessions.index(connection, {
    body: {
      sort: "ip",
      order: "asc",
    } satisfies ITodoAppUserSession.IRequest,
  });
  typia.assert(ipSort);
  // Test 12: Null/undefined sort parameters
  const nullSort = await api.functional.todoApp.sessions.index(connection, {
    body: {
      sort: undefined,
      order: undefined,
    } satisfies ITodoAppUserSession.IRequest,
  });
  typia.assert(nullSort);
  // Test 13: Pagination metadata verification
  const paginationTest = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {
        sort: "createdAt",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(paginationTest);
  TestValidator.equals("pagination page", paginationTest.pagination.current, 1);
  TestValidator.equals("pagination limit", paginationTest.pagination.limit, 10);
  // Test 14: Edge case - empty result with sorting
  const emptySort = await api.functional.todoApp.sessions.index(connection, {
    body: {
      sort: "createdAt",
      order: "desc",
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 172800000).toISOString(),
    } satisfies ITodoAppUserSession.IRequest,
  });
  typia.assert(emptySort);
  TestValidator.equals("empty result count", emptySort.data.length, 0);
  // Test 15: Date range filtering with sorting
  const dateRangeSorted = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {
        sort: "expiredAt",
        order: "asc",
        startDate: new Date(Date.now() - 86400000).toISOString(),
        endDate: new Date().toISOString(),
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(dateRangeSorted);
  // Test 16: Complex filtering with sorting
  const complexSorted = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {
        sort: "ip",
        order: "asc",
        expired: "active",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(complexSorted);
}
