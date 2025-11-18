import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test session search pagination functionality with large dataset.
 *
 * This test validates that the session search API correctly handles pagination
 * requests with different page sizes and page numbers. It creates an
 * authenticated user account, generates multiple sessions over time, and tests
 * various pagination scenarios including metadata validation, record
 * distribution, and sorting options.
 */
export async function test_api_user_session_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "testPassword123",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple sessions to test pagination
  const sessionCount = 25; // Create enough sessions for meaningful pagination
  const sessions: ITodoListUserSession[] = [];

  for (let i = 0; i < sessionCount; i++) {
    // Create sessions with different timestamps to test sorting
    const session: ITodoListUserSession =
      await api.functional.todoList.users.sessions.create(connection, {
        userId: user.id,
        body: {
          ip: `192.168.1.${i + 1}`,
          href: `https://example.com/page${i}`,
          referrer:
            i === 0 ? "https://google.com" : `https://example.com/page${i - 1}`,
        } satisfies ITodoListUserSession.ICreate,
      });
    typia.assert(session);
    sessions.push(session);

    // Add delay to ensure different timestamps
    if (i < sessionCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Sort sessions by created_at for reference (newest first)
  const sortedSessions = [...sessions].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // Step 3: Test pagination with different page sizes
  const pageSizes = [5, 10, 15] as const;

  for (const pageSize of pageSizes) {
    const totalPages = Math.ceil(sessionCount / pageSize);

    // Test each page
    for (let page = 1; page <= totalPages; page++) {
      const searchResult: IPageITodoListUserSession.ISummary =
        await api.functional.todoList.user.users.sessions.index(connection, {
          userId: user.id,
          body: {
            page: page,
            limit: pageSize,
            order_by: "created_at",
            order: "desc",
          } satisfies ITodoListUserSession.IRequest,
        });
      typia.assert(searchResult);

      // Validate pagination metadata
      TestValidator.equals(
        `page ${page} with size ${pageSize} has correct current page`,
        searchResult.pagination.current,
        page - 1, // API uses 0-based indexing
      );
      TestValidator.equals(
        `page ${page} with size ${pageSize} has correct limit`,
        searchResult.pagination.limit,
        pageSize,
      );
      TestValidator.equals(
        `page ${page} with size ${pageSize} has correct total records`,
        searchResult.pagination.records,
        sessionCount,
      );
      TestValidator.equals(
        `page ${page} with size ${pageSize} has correct total pages`,
        searchResult.pagination.pages,
        totalPages,
      );

      // Validate data count
      const expectedDataCount =
        page === totalPages ? sessionCount % pageSize || pageSize : pageSize;
      TestValidator.equals(
        `page ${page} with size ${pageSize} has correct data count`,
        searchResult.data.length,
        expectedDataCount,
      );

      // Validate session IDs match expected sessions (sorted by created_at desc)
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, sessionCount);
      const expectedSessionIds = sortedSessions
        .slice(startIndex, endIndex)
        .map((s) => s.id);

      TestValidator.equals(
        `page ${page} with size ${pageSize} contains correct session IDs`,
        searchResult.data.map((d) => d.id),
        expectedSessionIds,
      );
    }
  }

  // Step 4: Test different sorting options
  const sortingOptions: Array<{
    order_by: "created_at" | "expired_at" | "ip";
    order: "asc" | "desc";
  }> = [
    { order_by: "created_at", order: "asc" },
    { order_by: "created_at", order: "desc" },
    { order_by: "ip", order: "asc" },
    { order_by: "ip", order: "desc" },
  ];

  for (const sortingOption of sortingOptions) {
    const searchResult: IPageITodoListUserSession.ISummary =
      await api.functional.todoList.user.users.sessions.index(connection, {
        userId: user.id,
        body: {
          page: 1,
          limit: 10,
          order_by: sortingOption.order_by,
          order: sortingOption.order,
        } satisfies ITodoListUserSession.IRequest,
      });
    typia.assert(searchResult);

    // Validate that we got results
    TestValidator.predicate(
      `sorting by ${sortingOption.order_by} ${sortingOption.order} returns data`,
      searchResult.data.length > 0,
    );

    // Validate sorting order for created_at
    if (sortingOption.order_by === "created_at") {
      const dates = searchResult.data.map((d) =>
        new Date(d.created_at).getTime(),
      );
      const isSorted = dates.every(
        (date, index, array) =>
          index === 0 ||
          (sortingOption.order === "desc"
            ? date <= array[index - 1]
            : date >= array[index - 1]),
      );
      TestValidator.predicate(
        `sessions are correctly sorted by created_at ${sortingOption.order}`,
        isSorted,
      );
    }
  }

  // Step 5: Test IP filtering
  const testIp = "192.168.1.5";
  const ipFilterResult: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        ip: testIp,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(ipFilterResult);

  // Should find the session with the specific IP
  TestValidator.predicate(
    "IP filtering returns matching sessions",
    ipFilterResult.data.some((session) => session.ip === testIp),
  );
  TestValidator.predicate(
    "IP filtering only returns sessions with matching IP",
    ipFilterResult.data.every((session) => session.ip === testIp),
  );

  // Step 6: Test edge cases
  // Test page beyond total pages
  const beyondPageResult: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 100, // Far beyond actual pages
        limit: 10,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(beyondPageResult);

  // Should return empty data for pages beyond total
  TestValidator.equals(
    "page beyond total pages returns empty data",
    beyondPageResult.data.length,
    0,
  );
  TestValidator.equals(
    "page beyond total pages has correct pagination metadata",
    beyondPageResult.pagination.current,
    99, // 0-based indexing for page 100
  );
}
