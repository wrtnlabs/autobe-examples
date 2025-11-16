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
 * Test successful user logout by deleting their current active session.
 *
 * This test validates the complete session logout flow:
 *
 * 1. User registration and authentication setup
 * 2. Session establishment through login
 * 3. Session identification through listing
 * 4. Session termination through deletion
 * 5. Verification of proper logout functionality
 *
 * The test ensures that users can securely log out by deleting their active
 * sessions, which immediately invalidates all associated JWT tokens. This
 * provides users with control over their session lifecycle and security.
 */
export async function test_api_user_session_logout_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123";
  const currentUrl = "https://example.com/login";
  const referrerUrl = "https://example.com/register";

  const joinRequest = {
    email: userEmail,
    password: userPassword,
    href: currentUrl,
    referrer: referrerUrl,
  } satisfies ITodoAppUser.IJoin;

  const joinedUser = await api.functional.auth.user.join(connection, {
    body: joinRequest,
  });
  typia.assert(joinedUser);

  // Step 2: Login to establish session
  const loginRequest = {
    email: userEmail,
    password: userPassword,
    href: currentUrl,
    referrer: referrerUrl,
  } satisfies ITodoAppUser.ILogin;

  const loggedInUser = await api.functional.auth.user.login(connection, {
    body: loginRequest,
  });
  typia.assert(loggedInUser);

  // Verify tokens are present after login
  TestValidator.predicate(
    "access token present",
    loggedInUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    loggedInUser.token.refresh.length > 0,
  );

  // Step 3: List user sessions to find the active session
  const sessionListRequest = {
    page: 1,
    limit: 10,
  } satisfies ITodoAppUserSession.IRequest;

  const sessionsPage = await api.functional.todoApp.user.auth.sessions.index(
    connection,
    {
      body: sessionListRequest,
    },
  );
  typia.assert(sessionsPage);

  TestValidator.predicate("has active sessions", sessionsPage.data.length > 0);

  // Find the most recent session (should be the login we just performed)
  const sessionsSorted = [...sessionsPage.data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const activeSession = sessionsSorted[0];

  // Verify session properties
  TestValidator.equals(
    "session user ID",
    activeSession.user.id,
    loggedInUser.id,
  );
  TestValidator.predicate(
    "session not expired",
    activeSession.expired_at === undefined,
  );

  // Step 4: Delete the active session (logout)
  const deletedSession = await api.functional.todoApp.user.auth.sessions.erase(
    connection,
    {
      sessionId: activeSession.id,
    },
  );
  typia.assert(deletedSession);

  // Verify the deleted session data matches what we expected
  TestValidator.equals(
    "deleted session ID",
    deletedSession.id,
    activeSession.id,
  );
  TestValidator.equals(
    "deleted session user",
    deletedSession.user.id,
    loggedInUser.id,
  );

  // Step 5: Verify session is terminated by listing again
  const sessionsAfterLogout =
    await api.functional.todoApp.user.auth.sessions.index(connection, {
      body: sessionListRequest,
    });
  typia.assert(sessionsAfterLogout);

  // The deleted session should either not be present or be marked as expired
  const deletedSessionInList = sessionsAfterLogout.data.find(
    (s) => s.id === activeSession.id,
  );

  if (deletedSessionInList) {
    TestValidator.predicate(
      "session is expired after deletion",
      deletedSessionInList.expired_at !== undefined,
    );
  } else {
    TestValidator.predicate(
      "session not found after deletion",
      deletedSessionInList === undefined,
    );
  }
}
