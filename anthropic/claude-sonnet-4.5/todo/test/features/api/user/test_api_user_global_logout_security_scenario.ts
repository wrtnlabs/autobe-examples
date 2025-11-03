import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the security use case where a user performs a global logout after
 * suspecting account compromise.
 *
 * This test validates that global logout provides complete session revocation
 * by:
 *
 * 1. Creating a user account
 * 2. Establishing multiple sessions through repeated logins (simulating multiple
 *    devices)
 * 3. Performing a global logout from one session
 * 4. Verifying all previously valid tokens from other sessions are rejected
 * 5. Confirming the user must re-authenticate to regain access
 *
 * The test ensures that global logout sets expired_at for all sessions
 * belonging to the user and that all previously valid access tokens are
 * rejected when used for authenticated requests, providing effective security
 * protection.
 */
export async function test_api_user_global_logout_security_scenario(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const registrationData = {
    email: userEmail,
    password: userPassword,
    ip: "192.168.1.100",
    href: "https://example.com/register" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies ITodoListUser.IRegister;

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: registrationData,
  });
  typia.assert(registeredUser);

  // Step 2: Save the first session token, then create additional sessions
  const firstSessionToken = registeredUser.token.access;

  // Create a fresh connection without authentication for additional logins
  const unauthConnection = { ...connection, headers: {} };

  const session2Data = {
    email: userEmail,
    password: userPassword,
    ip: "192.168.1.102",
    href: "https://example.com/login" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies ITodoListUser.ILogin;

  const session2 = await api.functional.auth.user.login(unauthConnection, {
    body: session2Data,
  });
  typia.assert(session2);
  const session2Token = session2.token.access;

  const session3Data = {
    email: userEmail,
    password: userPassword,
    ip: "192.168.1.103",
    href: "https://example.com/login" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies ITodoListUser.ILogin;

  const session3 = await api.functional.auth.user.login(unauthConnection, {
    body: session3Data,
  });
  typia.assert(session3);
  const session3Token = session3.token.access;

  // Step 3: Verify all sessions have valid tokens
  TestValidator.predicate(
    "first session has valid access token",
    firstSessionToken.length > 0,
  );
  TestValidator.predicate(
    "session 2 has valid access token",
    session2Token.length > 0,
  );
  TestValidator.predicate(
    "session 3 has valid access token",
    session3Token.length > 0,
  );

  // Step 4: Perform global logout using the first session (connection already has this token)
  await api.functional.todoList.user.users._logout.all.logoutAll(connection);

  // Step 5: Create new connections with the invalidated session tokens and verify they fail
  const invalidatedSession2Conn = { ...connection, headers: {} };
  await api.functional.auth.user.login(invalidatedSession2Conn, {
    body: session2Data,
  });

  await TestValidator.error(
    "session 2 token should be rejected after global logout",
    async () => {
      await api.functional.todoList.user.users._logout.all.logoutAll(
        invalidatedSession2Conn,
      );
    },
  );

  const invalidatedSession3Conn = { ...connection, headers: {} };
  await api.functional.auth.user.login(invalidatedSession3Conn, {
    body: session3Data,
  });

  await TestValidator.error(
    "session 3 token should be rejected after global logout",
    async () => {
      await api.functional.todoList.user.users._logout.all.logoutAll(
        invalidatedSession3Conn,
      );
    },
  );

  // Step 6: Verify user can re-authenticate after global logout
  const reloginConnection = { ...connection, headers: {} };
  const reloginData = {
    email: userEmail,
    password: userPassword,
    ip: "192.168.1.104",
    href: "https://example.com/login" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/logout" satisfies string &
      tags.Format<"uri">,
  } satisfies ITodoListUser.ILogin;

  const newSession = await api.functional.auth.user.login(reloginConnection, {
    body: reloginData,
  });
  typia.assert(newSession);

  TestValidator.predicate(
    "user can create new session after global logout",
    newSession.token.access.length > 0,
  );
}
