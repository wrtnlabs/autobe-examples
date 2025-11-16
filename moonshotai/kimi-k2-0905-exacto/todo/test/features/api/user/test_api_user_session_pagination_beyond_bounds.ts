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
 * Test pagination behavior when requesting pages beyond the available session
 * count.
 *
 * This test validates proper handling of out-of-bounds page requests with
 * appropriate empty result responses and correct pagination metadata,
 * preventing application errors from invalid pagination parameters.
 *
 * Test flow:
 *
 * 1. Create a new user account with authentication
 * 2. Retrieve sessions with normal pagination to establish baseline
 * 3. Request pages beyond available data (high page numbers)
 * 4. Verify empty data arrays and correct pagination metadata
 * 5. Test edge cases like extremely high page numbers and different limits
 * 6. Validate that pagination info correctly reflects total records and pages
 */
export async function test_api_user_session_pagination_beyond_bounds(
  connection: api.IConnection,
) {
  // Create authenticated user account
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      ip: "127.0.0.1",
      href: "https://example.com/todo",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Get initial sessions to understand current state
  const initialSessions = await api.functional.todoApp.user.auth.sessions.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(initialSessions);

  // Test requesting page beyond available data
  const beyondBoundsPage = initialSessions.pagination.pages + 10;
  const beyondBoundsResult =
    await api.functional.todoApp.user.auth.sessions.index(connection, {
      body: {
        page: beyondBoundsPage,
        limit: 10,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(beyondBoundsResult);

  // Verify empty data and correct pagination metadata
  TestValidator.equals(
    "beyond bounds data should be empty",
    beyondBoundsResult.data,
    [],
  );
  TestValidator.equals(
    "current page should match requested",
    beyondBoundsResult.pagination.current,
    beyondBoundsPage,
  );
  TestValidator.equals(
    "records count should be accurate",
    beyondBoundsResult.pagination.records,
    initialSessions.pagination.records,
  );
  TestValidator.equals(
    "total pages should be accurate",
    beyondBoundsResult.pagination.pages,
    initialSessions.pagination.pages,
  );

  // Test with very high page number
  const veryHighPage = 9999;
  const veryHighResult = await api.functional.todoApp.user.auth.sessions.index(
    connection,
    {
      body: {
        page: veryHighPage,
        limit: 5,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(veryHighResult);

  TestValidator.equals(
    "very high page data should be empty",
    veryHighResult.data,
    [],
  );
  TestValidator.equals(
    "very high page current should match",
    veryHighResult.pagination.current,
    veryHighPage,
  );

  // Test edge case with different limit sizes
  const largeLimitResult =
    await api.functional.todoApp.user.auth.sessions.index(connection, {
      body: {
        page: beyondBoundsPage,
        limit: 100,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(largeLimitResult);

  TestValidator.equals(
    "large limit beyond bounds should be empty",
    largeLimitResult.data,
    [],
  );
  TestValidator.equals(
    "pagination metadata should remain consistent",
    largeLimitResult.pagination.records,
    initialSessions.pagination.records,
  );

  // Test boundary case - page equal to total pages + 1
  const boundaryPage = initialSessions.pagination.pages + 1;
  const boundaryResult = await api.functional.todoApp.user.auth.sessions.index(
    connection,
    {
      body: {
        page: boundaryPage,
        limit: 10,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(boundaryResult);

  TestValidator.equals(
    "boundary page data should be empty",
    boundaryResult.data,
    [],
  );
  TestValidator.equals(
    "boundary page current should match",
    boundaryResult.pagination.current,
    boundaryPage,
  );
}
