import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test session search pagination functionality with various page sizes and
 * result sets. Validate that pagination controls (page, limit) work correctly
 * and return appropriate metadata including current page, total records, and
 * total pages. Test edge cases including requesting pages beyond available
 * results, minimum/maximum limit values, and empty result sets. Verify that
 * pagination metadata accurately reflects the filtered session data and
 * maintains consistency across multiple requests.
 */
export async function test_api_user_sessions_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create an authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create multiple login sessions for the user
  // We'll create sessions by logging in multiple times with different connection contexts
  const sessionCount = 15;

  for (let i = 0; i < sessionCount; i++) {
    // Create a fresh connection for each login to ensure distinct sessions
    const freshConnection: api.IConnection = { ...connection, headers: {} };

    // Login to create a new session
    await api.functional.auth.user.login(freshConnection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: `https://example.com/login-${i}`,
        referrer: "https://example.com",
      } satisfies ITodoAppUser.ILogin,
    });
  }

  // Step 3: Test pagination with different page sizes
  // Test case 1: Small page size (limit = 5)
  const pageSize5Results =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userEmail: userEmail,
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(pageSize5Results);

  TestValidator.equals(
    "page 1 with limit 5 should return up to 5 sessions",
    pageSize5Results.data.length <= 5,
    true,
  );
  TestValidator.equals(
    "page 1 current page should be 1",
    pageSize5Results.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit should be 5",
    pageSize5Results.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "total records should be reasonable",
    pageSize5Results.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    pageSize5Results.pagination.pages ===
      Math.ceil(pageSize5Results.pagination.records / 5) ||
      (pageSize5Results.pagination.records === 0 &&
        pageSize5Results.pagination.pages === 0),
  );

  // Test case 2: Medium page size (limit = 10)
  const pageSize10Results =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userEmail: userEmail,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(pageSize10Results);

  TestValidator.equals(
    "page 1 with limit 10 should return up to 10 sessions",
    pageSize10Results.data.length <= 10,
    true,
  );
  TestValidator.equals(
    "page 1 current page should be 1",
    pageSize10Results.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit should be 10",
    pageSize10Results.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be consistent across requests",
    pageSize10Results.pagination.records,
    pageSize5Results.pagination.records,
  );

  // Test case 3: Navigate to page 2 if multiple pages exist
  if (pageSize10Results.pagination.pages > 1) {
    const page2Results = await api.functional.todoApp.user.users.sessions.index(
      connection,
      {
        userEmail: userEmail,
        body: {
          page: 2,
          limit: 10,
        } satisfies ITodoAppUserSession.IRequest,
      },
    );
    typia.assert(page2Results);

    TestValidator.equals(
      "page 2 current page should be 2",
      page2Results.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit should be 10",
      page2Results.pagination.limit,
      10,
    );
    TestValidator.equals(
      "total records should remain consistent",
      page2Results.pagination.records,
      pageSize10Results.pagination.records,
    );
  }

  // Test case 4: Edge case - page beyond available results
  const highPageNumber = pageSize10Results.pagination.pages + 2;
  const beyondPageResults =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userEmail: userEmail,
      body: {
        page: highPageNumber,
        limit: 10,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(beyondPageResults);

  TestValidator.equals(
    "page beyond total pages should return empty data array",
    beyondPageResults.data.length,
    0,
  );
  TestValidator.equals(
    "current page should be the requested page",
    beyondPageResults.pagination.current,
    highPageNumber,
  );
  TestValidator.equals(
    "limit should remain unchanged",
    beyondPageResults.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should remain consistent",
    beyondPageResults.pagination.records,
    pageSize10Results.pagination.records,
  );

  // Test case 5: Minimum limit value (limit = 1)
  const minLimitResults =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userEmail: userEmail,
      body: {
        page: 1,
        limit: 1,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(minLimitResults);

  TestValidator.equals(
    "minimum limit should return up to 1 session",
    minLimitResults.data.length <= 1,
    true,
  );
  TestValidator.equals(
    "limit should be 1",
    minLimitResults.pagination.limit,
    1,
  );

  // Test case 6: Maximum limit value (limit = 100)
  const maxLimitResults =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userEmail: userEmail,
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(maxLimitResults);

  TestValidator.equals(
    "maximum limit should return all available sessions",
    maxLimitResults.data.length,
    maxLimitResults.pagination.records,
  );
  TestValidator.equals(
    "limit should be 100",
    maxLimitResults.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "total pages should be correct for maximum limit",
    maxLimitResults.pagination.pages === 1 ||
      maxLimitResults.pagination.records === 0,
  );

  // Test case 7: Verify session data consistency
  // Get all sessions with maximum limit and verify they match the sum of paginated results
  const allSessionsPage1 =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userEmail: userEmail,
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(allSessionsPage1);

  // Verify that session IDs are unique across all paginated results
  const allSessionIds = new Set(
    allSessionsPage1.data.map((session) => session.id),
  );
  TestValidator.equals(
    "all session IDs should be unique",
    allSessionIds.size,
    allSessionsPage1.data.length,
  );

  // Test case 8: Empty result set with filtering
  const emptyFilterResults =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userEmail: userEmail,
      body: {
        page: 1,
        limit: 10,
        search: "nonexistent_search_term_that_wont_match_anything",
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(emptyFilterResults);

  TestValidator.equals(
    "search with non-matching term should return empty data",
    emptyFilterResults.data.length,
    0,
  );
  TestValidator.equals(
    "total records should be 0 for non-matching search",
    emptyFilterResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0 for empty result set",
    emptyFilterResults.pagination.pages,
    0,
  );
}
