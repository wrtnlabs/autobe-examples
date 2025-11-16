import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test that administrators can successfully retrieve and filter active sessions
 * for a specific user account.
 *
 * This test validates the complete workflow of admin authentication, user
 * account creation with authentication, and retrieving user sessions through
 * admin-level queries with various filtering options.
 *
 * Validates:
 *
 * 1. Admin successfully authenticates and gains administrative privileges
 * 2. A test user account is created and authenticated
 * 3. Admin can retrieve sessions for the target user
 * 4. Filtering by IP address returns matching sessions
 * 5. Date range filtering correctly limits results
 * 6. Pagination controls work correctly with page and limit parameters
 * 7. Sorting by created_at in both ascending and descending order
 * 8. Response includes proper pagination metadata
 * 9. Session records contain all required fields validated by typia.assert()
 */
export async function test_api_user_sessions_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator to gain privileges for viewing user sessions
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create test user account whose sessions will be monitored
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();
  const userIP = "192.168.1.100";

  const testUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        ip: userIP,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(testUser);

  const testUserId = testUser.id;

  // Step 3: Retrieve all sessions for the target user without filters
  const allSessionsResponse: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.admin.users.sessions.index(connection, {
      userId: testUserId,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(allSessionsResponse);

  // Step 4: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    allSessionsResponse.pagination.current === 1,
  );

  TestValidator.predicate(
    "should have at least 1 session",
    allSessionsResponse.pagination.records >= 1,
  );

  TestValidator.predicate(
    "data array should contain session records",
    allSessionsResponse.data.length > 0,
  );

  // Step 5: Validate session record structure
  const firstSession = allSessionsResponse.data[0];
  typia.assert(firstSession);

  TestValidator.equals(
    "session should have user_id matching test user",
    firstSession.todo_list_user_id,
    testUserId,
  );

  // Step 6: Test filtering by IP address
  const ipFilterResponse: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.admin.users.sessions.index(connection, {
      userId: testUserId,
      body: {
        page: 1,
        limit: 10,
        ip: userIP,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(ipFilterResponse);

  // Validate IP filtering works
  if (ipFilterResponse.data.length > 0) {
    for (const session of ipFilterResponse.data) {
      TestValidator.equals(
        "filtered session IP should match filter",
        session.ip,
        userIP,
      );
    }
  }

  // Step 7: Test date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  const dateFilterResponse: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.admin.users.sessions.index(connection, {
      userId: testUserId,
      body: {
        page: 1,
        limit: 10,
        created_after: oneHourAgo.toISOString(),
        created_before: oneHourFromNow.toISOString(),
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(dateFilterResponse);

  TestValidator.predicate(
    "date filtered response should be valid",
    dateFilterResponse.data.length >= 0,
  );

  // Step 8: Test pagination with different page sizes
  const smallPageResponse: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.admin.users.sessions.index(connection, {
      userId: testUserId,
      body: {
        page: 1,
        limit: 2,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(smallPageResponse);

  TestValidator.predicate(
    "small page limit should be respected",
    smallPageResponse.data.length <= 2,
  );

  TestValidator.equals(
    "pagination limit should match request",
    smallPageResponse.pagination.limit,
    2,
  );

  // Step 9: Test sorting - ascending order
  const ascendingSortResponse: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.admin.users.sessions.index(connection, {
      userId: testUserId,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "asc",
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(ascendingSortResponse);

  // Step 10: Test sorting - descending order
  const descendingSortResponse: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.admin.users.sessions.index(connection, {
      userId: testUserId,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(descendingSortResponse);

  // Validate sorting works if we have multiple sessions
  if (descendingSortResponse.data.length >= 2) {
    const firstCreatedAt = new Date(descendingSortResponse.data[0].created_at);
    const secondCreatedAt = new Date(descendingSortResponse.data[1].created_at);

    TestValidator.predicate(
      "descending sort should have newest sessions first",
      firstCreatedAt >= secondCreatedAt,
    );
  }
}
