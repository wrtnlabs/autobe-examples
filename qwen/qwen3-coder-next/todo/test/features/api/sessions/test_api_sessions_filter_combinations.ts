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

export async function test_api_sessions_filter_combinations(
  connection: api.IConnection,
): Promise<void> {
  // Test session filter combinations using api.functional.todoApp.sessions.index
  // Test 1: Filter by user ID
  const byUserId = await api.functional.todoApp.sessions.index(connection, {
    body: {
      userId: typia.random<string & tags.Format<"uuid">>(),
    } satisfies ITodoAppUserSession.IRequest,
  });
  typia.assert(byUserId);
  // Test 2: Filter by IP address
  const byIp = await api.functional.todoApp.sessions.index(connection, {
    body: {
      ip: "192.168.1.1",
    } satisfies ITodoAppUserSession.IRequest,
  });
  typia.assert(byIp);
  // Test 3: Filter by date range
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const byDateRange = await api.functional.todoApp.sessions.index(connection, {
    body: {
      startDate: yesterday,
      endDate: now,
    } satisfies ITodoAppUserSession.IRequest,
  });
  typia.assert(byDateRange);
  // Test 4: Filter by expiration status
  const byExpiration = await api.functional.todoApp.sessions.index(connection, {
    body: {
      expired: "active",
    } satisfies ITodoAppUserSession.IRequest,
  });
  typia.assert(byExpiration);
  // Test 5: Filter by referrer URL
  const byReferrer = await api.functional.todoApp.sessions.index(connection, {
    body: {
      referrer: "https://example.com",
    } satisfies ITodoAppUserSession.IRequest,
  });
  typia.assert(byReferrer);
  // Test 6: Combined filters
  const combinedFilters = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {
        userId: typia.random<string & tags.Format<"uuid">>(),
        startDate: yesterday,
        expired: "active",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(combinedFilters);
  // Test 7: Sorting by creation date (newest first)
  const sortByCreated = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {
        sort: "createdAt",
        order: "desc",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(sortByCreated);
  // Test 8: Sorting by expiration date (earliest first)
  const sortByExpired = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {
        sort: "expiredAt",
        order: "asc",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(sortByExpired);
  // Test 9: Pagination with custom values
  const paginated = await api.functional.todoApp.sessions.index(connection, {
    body: {
      page: 1,
      limit: 25,
    } satisfies ITodoAppUserSession.IRequest,
  });
  typia.assert(paginated);
  // Test 10: Default pagination parameters
  const defaultPagination = await api.functional.todoApp.sessions.index(
    connection,
    {
      body: {} satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(defaultPagination);
}
