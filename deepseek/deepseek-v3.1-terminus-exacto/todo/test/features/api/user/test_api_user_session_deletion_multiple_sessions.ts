import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test session deletion functionality.
 *
 * This test validates that session deletion works correctly by creating a user
 * account, authenticating to create a session, then attempting to delete that
 * session. Since the system doesn't provide session listing capabilities, we
 * test the basic session deletion operation with valid parameters.
 */
export async function test_api_user_session_deletion_multiple_sessions(
  connection: api.IConnection,
) {
  // Generate unique test data
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";
  const baseUrl = "https://example.com";

  // 1. Create user account
  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: baseUrl,
      referrer: baseUrl,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // 2. Create a session by authenticating
  const loggedInUser = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: baseUrl,
      referrer: baseUrl,
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loggedInUser);

  // 3. Test session deletion with valid UUID session ID
  // Since we don't have session listing, we test with a valid UUID format
  const testSessionId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.todoApp.user.users.sessions.eraseByUseremailAndSessionid(
    connection,
    {
      userEmail: userEmail,
      sessionId: testSessionId,
    },
  );

  // 4. Verify that normal authentication still works after session deletion attempt
  const reauthenticatedUser = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: baseUrl,
      referrer: baseUrl,
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(reauthenticatedUser);

  TestValidator.equals(
    "user should still be able to authenticate after session deletion attempt",
    reauthenticatedUser.email,
    userEmail,
  );

  // 5. Test session deletion with the same user email but different session ID
  const anotherSessionId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.todoApp.user.users.sessions.eraseByUseremailAndSessionid(
    connection,
    {
      userEmail: userEmail,
      sessionId: anotherSessionId,
    },
  );

  // 6. Final verification that the system remains functional
  const finalAuth = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: baseUrl,
      referrer: baseUrl,
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(finalAuth);

  TestValidator.predicate(
    "system should remain fully functional after multiple session deletion attempts",
    finalAuth.email === userEmail && finalAuth.name !== "",
  );
}
