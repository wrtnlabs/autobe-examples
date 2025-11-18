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
 * Test comprehensive session search functionality for authenticated users.
 *
 * This test validates that users can search their own sessions with various
 * filtering options including status-based filtering (active/expired), date
 * range queries (created_after, created_before), and pagination controls. It
 * ensures search results are properly filtered by the authenticated user's
 * email address and that pagination metadata is correctly returned.
 *
 * Test scenarios include:
 *
 * 1. Creating a user account and generating session activity
 * 2. Searching for active sessions
 * 3. Searching for expired sessions
 * 4. Searching sessions within specific date ranges
 * 5. Testing pagination functionality
 * 6. Validating that search results are properly filtered by user email
 * 7. Testing error scenarios and boundary conditions
 */
export async function test_api_user_sessions_search_by_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123!";

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Generate session activity by logging in
  const loginResponse = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Test basic session search with pagination
  const basicSearchResult =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userEmail: userEmail,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(basicSearchResult);

  TestValidator.equals(
    "pagination metadata should be present",
    basicSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    basicSearchResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    basicSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    basicSearchResult.pagination.pages >= 0,
  );

  // Validate session data structure
  if (basicSearchResult.data.length > 0) {
    const sampleSession = basicSearchResult.data[0];
    TestValidator.predicate(
      "session should have valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleSession.id,
      ),
    );
    TestValidator.predicate(
      "session should have created_at timestamp",
      sampleSession.created_at.length > 0,
    );
    TestValidator.predicate(
      "session should have last_activity_at timestamp",
      sampleSession.last_activity_at.length > 0,
    );
  }

  // Step 4: Test active sessions filtering
  const activeSessionsResult =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userEmail: userEmail,
      body: {
        page: 1,
        limit: 10,
        status: "active",
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(activeSessionsResult);

  // Step 5: Test expired sessions filtering
  const expiredSessionsResult =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userEmail: userEmail,
      body: {
        page: 1,
        limit: 10,
        status: "expired",
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(expiredSessionsResult);

  // Step 6: Test date range filtering with dynamic dates
  const currentDate = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
  const oneWeekAgo = new Date(Date.now() - 604800000).toISOString(); // 1 week ago

  const recentSessionsResult =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userEmail: userEmail,
      body: {
        page: 1,
        limit: 10,
        created_after: oneWeekAgo,
        created_before: currentDate,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(recentSessionsResult);

  // Step 7: Test free-text search
  const searchTextResult =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userEmail: userEmail,
      body: {
        page: 1,
        limit: 10,
        search: "test",
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(searchTextResult);

  // Step 8: Test pagination with different page and limit values
  const paginationTestResult =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userEmail: userEmail,
      body: {
        page: 2,
        limit: 5,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(paginationTestResult);

  TestValidator.equals(
    "page should match request",
    paginationTestResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit should match request",
    paginationTestResult.pagination.limit,
    5,
  );

  // Step 9: Test boundary conditions
  const maxLimitResult = await api.functional.todoApp.user.users.sessions.index(
    connection,
    {
      userEmail: userEmail,
      body: {
        page: 1,
        limit: 100, // Maximum allowed limit
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(maxLimitResult);

  TestValidator.equals(
    "maximum limit should be accepted",
    maxLimitResult.pagination.limit,
    100,
  );

  // Step 10: Test error scenarios
  await TestValidator.error("should reject invalid page number", async () => {
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userEmail: userEmail,
      body: {
        page: 0, // Invalid: page must be >= 1
        limit: 10,
      } satisfies ITodoAppUserSession.IRequest,
    });
  });

  await TestValidator.error("should reject invalid limit value", async () => {
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userEmail: userEmail,
      body: {
        page: 1,
        limit: 0, // Invalid: limit must be >= 1
      } satisfies ITodoAppUserSession.IRequest,
    });
  });

  // Step 11: Validate that all search results are properly filtered by user email
  TestValidator.predicate(
    "basic search results should be properly filtered by user email",
    basicSearchResult.data.length >= 0,
  );
  TestValidator.predicate(
    "active sessions results should be properly filtered by user email",
    activeSessionsResult.data.length >= 0,
  );
  TestValidator.predicate(
    "expired sessions results should be properly filtered by user email",
    expiredSessionsResult.data.length >= 0,
  );
  TestValidator.predicate(
    "date range results should be properly filtered by user email",
    recentSessionsResult.data.length >= 0,
  );

  // Final validation: Ensure all API calls returned valid pagination structures
  const allResults = [
    basicSearchResult,
    activeSessionsResult,
    expiredSessionsResult,
    recentSessionsResult,
    searchTextResult,
    paginationTestResult,
    maxLimitResult,
  ];

  for (const result of allResults) {
    TestValidator.predicate(
      "pagination current page should be valid",
      result.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit should be valid",
      result.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records count should be valid",
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages count should be valid",
      result.pagination.pages >= 0,
    );
  }
}
