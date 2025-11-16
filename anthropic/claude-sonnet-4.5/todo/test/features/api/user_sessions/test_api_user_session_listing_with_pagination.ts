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
 * Test the retrieval of paginated user session listings.
 *
 * This test validates the complete session management workflow including:
 *
 * 1. User registration and initial authentication
 * 2. Creating multiple authentication sessions (simulating multiple device logins)
 * 3. Retrieving session list with pagination parameters
 * 4. Validating pagination metadata and session summary data
 * 5. Testing pagination controls for navigating session history
 *
 * The test ensures users can monitor their active logins across different
 * devices and locations with proper pagination support for scalable browsing.
 */
export async function test_api_user_session_listing_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "securePassword123!";

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Create multiple sessions by logging in several times
  // This simulates the user logging in from different devices/locations
  const sessionCount = 7;
  const loginSessions = await ArrayUtil.asyncRepeat(
    sessionCount,
    async (index) => {
      const loginResult: ITodoListUser.IAuthorized =
        await api.functional.auth.user.login(connection, {
          body: {
            email: userEmail,
            password: userPassword,
            ip: `192.168.1.${100 + index}`,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies ITodoListUser.ILogin,
        });
      typia.assert(loginResult);
      return loginResult;
    },
  );

  // Step 3: Retrieve the first page of sessions with pagination
  const pageLimit = 3;
  const firstPageRequest = {
    page: 1,
    limit: pageLimit,
    sort_by: "created_at" as const,
    order: "desc" as const,
  } satisfies ITodoListUserSession.IRequest;

  const firstPage: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: registeredUser.id,
      body: firstPageRequest,
    });
  typia.assert(firstPage);

  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "first page current number",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "total records should be at least session count plus one",
    firstPage.pagination.records >= sessionCount + 1,
  );
  TestValidator.predicate(
    "data array should not exceed limit",
    firstPage.data.length <= pageLimit,
  );

  // Step 5: Validate session summary structure and business logic
  TestValidator.predicate(
    "first page should contain session data",
    firstPage.data.length > 0,
  );

  const firstSession = firstPage.data[0];
  typia.assert(firstSession);
  TestValidator.equals(
    "session belongs to the user",
    firstSession.todo_list_user_id,
    registeredUser.id,
  );

  // Step 6: Test pagination navigation - retrieve second page
  if (firstPage.pagination.pages > 1) {
    const secondPageRequest = {
      page: 2,
      limit: pageLimit,
      sort_by: "created_at" as const,
      order: "desc" as const,
    } satisfies ITodoListUserSession.IRequest;

    const secondPage: IPageITodoListUserSession.ISummary =
      await api.functional.todoList.user.users.sessions.index(connection, {
        userId: registeredUser.id,
        body: secondPageRequest,
      });
    typia.assert(secondPage);

    TestValidator.equals(
      "second page current number",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page has same total records",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.predicate(
      "second page data array should not exceed limit",
      secondPage.data.length <= pageLimit,
    );

    // Verify different sessions on different pages
    const firstPageSessionIds = firstPage.data.map((s) => s.id);
    const secondPageSessionIds = secondPage.data.map((s) => s.id);
    const hasOverlap = secondPageSessionIds.some((id) =>
      firstPageSessionIds.includes(id),
    );
    TestValidator.predicate(
      "different pages should have different sessions",
      !hasOverlap,
    );
  }

  // Step 7: Test filtering by IP address
  const targetSession = firstPage.data[0];
  const filteredByIpRequest = {
    page: 1,
    limit: 10,
    ip: targetSession.ip,
  } satisfies ITodoListUserSession.IRequest;

  const filteredPage: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: registeredUser.id,
      body: filteredByIpRequest,
    });
  typia.assert(filteredPage);

  TestValidator.predicate(
    "filtered results should contain target IP",
    filteredPage.data.length > 0,
  );
  TestValidator.predicate(
    "all filtered sessions should match IP",
    filteredPage.data.every((session) => session.ip === targetSession.ip),
  );
}
