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
 * Test IP address filtering for user session listings.
 *
 * This test validates the session filtering functionality that allows users to
 * identify all login sessions originating from a specific IP address. This is
 * crucial for security monitoring use cases where users need to detect
 * suspicious activity or track sessions from particular network locations.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a user account
 * 2. Generate multiple sessions with the same IP address through repeated logins
 * 3. Query sessions filtered by the specific IP address
 * 4. Validate that all returned sessions match the specified IP address
 * 5. Verify pagination metadata is correctly populated for filtered results
 * 6. Confirm the filtering performs exact match comparison on the IP field
 */
export async function test_api_user_session_filtering_by_ip_address(
  connection: api.IConnection,
) {
  // Step 1: Create a user account and authenticate
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123!";
  const testIpAddress = "192.168.1.100";

  const joinData = {
    email: userEmail,
    password: userPassword,
    ip: testIpAddress,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinData });
  typia.assert(registeredUser);

  // Step 2: Create additional sessions by logging in multiple times with the same IP
  const sessionCount = 3;
  for (let i = 0; i < sessionCount; i++) {
    const loginData = {
      email: userEmail,
      password: userPassword,
      ip: testIpAddress,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ILogin;

    const loginResult: ITodoListUser.IAuthorized =
      await api.functional.auth.user.login(connection, { body: loginData });
    typia.assert(loginResult);
  }

  // Step 3: Query sessions filtered by IP address
  const filterRequest = {
    page: 1,
    limit: 10,
    ip: testIpAddress,
  } satisfies ITodoListUserSession.IRequest;

  const filteredSessions: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: registeredUser.id,
      body: filterRequest,
    });
  typia.assert(filteredSessions);

  // Step 4: Validate that all returned sessions match the specified IP address
  TestValidator.predicate(
    "filtered sessions should not be empty",
    filteredSessions.data.length > 0,
  );

  TestValidator.predicate(
    "all sessions should match the specified IP address",
    filteredSessions.data.every((session) => session.ip === testIpAddress),
  );

  // Step 5: Verify at least the expected number of sessions (initial join + logins)
  const expectedMinimumSessions = sessionCount + 1;
  TestValidator.predicate(
    "should have at least the expected number of sessions",
    filteredSessions.data.length >= expectedMinimumSessions,
  );

  // Step 6: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    filteredSessions.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    filteredSessions.pagination.limit === filterRequest.limit,
  );

  TestValidator.predicate(
    "pagination records should be at least the expected sessions",
    filteredSessions.pagination.records >= expectedMinimumSessions,
  );

  TestValidator.predicate(
    "pagination pages should be valid",
    filteredSessions.pagination.pages >= 1,
  );
}
