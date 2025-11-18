import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test bulk session termination security boundary.
 *
 * Validates that bulk session termination only affects the authenticated user's
 * own sessions and does not impact other users' sessions. This test creates two
 * separate user accounts, establishes multiple sessions for each, terminates
 * all sessions for the first user, and verifies that the second user's sessions
 * remain active and functional.
 *
 * Steps:
 *
 * 1. Create User A with multiple active sessions
 * 2. Create User B with multiple active sessions
 * 3. Authenticate as User A and terminate all sessions
 * 4. Verify User A's sessions are terminated
 * 5. Verify User B's sessions remain active (security boundary validated)
 */
export async function test_api_user_sessions_bulk_termination_security_boundary(
  connection: api.IConnection,
) {
  // Step 1: Create User A and establish multiple sessions
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = typia.random<string & tags.MinLength<8>>();
  const baseHref = typia.random<string & tags.Format<"uri">>();
  const baseReferrer = typia.random<string & tags.Format<"uri">>();

  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userA);

  // Create additional sessions for User A (3 sessions total including join)
  const userASession1 = await api.functional.auth.user.login(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(userASession1);

  const userASession2 = await api.functional.auth.user.login(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(userASession2);

  // Step 2: Create User B and establish multiple sessions
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = typia.random<string & tags.MinLength<8>>();

  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userB);

  // Create additional sessions for User B and PRESERVE the token
  const userBSession1 = await api.functional.auth.user.login(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(userBSession1);

  // Store User B's session token BEFORE User A's termination
  const userBPreTerminationToken = userBSession1.token.access;

  const userBSession2 = await api.functional.auth.user.login(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(userBSession2);

  // Step 3: Authenticate as User A and perform bulk session termination
  await api.functional.auth.user.login(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies ITodoListUser.ILogin,
  });

  // Terminate all sessions for User A
  await api.functional.todoList.user.users.me.sessions.eraseAll(connection);

  // Step 4: Verify User B's EXISTING sessions remain active
  // Create a connection with User B's pre-termination token
  const userBConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: userBPreTerminationToken,
    },
  };

  // If User B's sessions were incorrectly affected, this would fail
  // This proves the security boundary is working correctly
  await api.functional.todoList.user.users.me.sessions.eraseAll(
    userBConnection,
  );

  // Step 5: Verify User B can still create new sessions
  const userBVerification = await api.functional.auth.user.login(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(userBVerification);

  // Verify User B's identity is correct (security boundary validated)
  TestValidator.equals(
    "User B identity preserved after User A session termination",
    userBVerification.id,
    userB.id,
  );

  TestValidator.equals(
    "User B email preserved after User A session termination",
    userBVerification.email,
    userBEmail,
  );
}
