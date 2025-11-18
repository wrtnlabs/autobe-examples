import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that each successful login creates a new session record in the
 * todo_list_user_sessions table.
 *
 * This test validates session management behavior for multiple login operations
 * by:
 *
 * 1. Creating a user account through registration
 * 2. Performing multiple successful login operations with the same credentials
 *    from different contexts
 * 3. Verifying that each login returns different JWT tokens (indicating new
 *    sessions)
 *
 * This confirms the system properly tracks multiple concurrent sessions for a
 * single user, allowing users to be logged in from multiple devices
 * simultaneously.
 */
export async function test_api_user_login_creates_new_session(
  connection: api.IConnection,
) {
  // Step 1: Create a user account through registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registeredUser);

  // Store first session tokens from registration
  const firstSessionTokens = {
    access: registeredUser.token.access,
    refresh: registeredUser.token.refresh,
  };

  // Step 2: Perform first login with different context (different href and referrer)
  const firstLogin = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(firstLogin);

  // Step 3: Verify first login created a new session with different tokens
  TestValidator.predicate(
    "first login access token differs from registration",
    firstLogin.token.access !== firstSessionTokens.access,
  );
  TestValidator.predicate(
    "first login refresh token differs from registration",
    firstLogin.token.refresh !== firstSessionTokens.refresh,
  );

  // Store second session tokens
  const secondSessionTokens = {
    access: firstLogin.token.access,
    refresh: firstLogin.token.refresh,
  };

  // Step 4: Perform second login with yet another different context
  const secondLogin = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(secondLogin);

  // Step 5: Verify second login created a new session with different tokens from both previous sessions
  TestValidator.predicate(
    "second login access token differs from first login",
    secondLogin.token.access !== secondSessionTokens.access,
  );
  TestValidator.predicate(
    "second login refresh token differs from first login",
    secondLogin.token.refresh !== secondSessionTokens.refresh,
  );
  TestValidator.predicate(
    "second login access token differs from registration",
    secondLogin.token.access !== firstSessionTokens.access,
  );
  TestValidator.predicate(
    "second login refresh token differs from registration",
    secondLogin.token.refresh !== firstSessionTokens.refresh,
  );

  // Step 6: Perform third login to further validate multiple concurrent sessions
  const thirdLogin = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(thirdLogin);

  // Step 7: Verify third login created yet another unique session
  TestValidator.predicate(
    "third login access token differs from second login",
    thirdLogin.token.access !== secondLogin.token.access,
  );
  TestValidator.predicate(
    "third login refresh token differs from second login",
    thirdLogin.token.refresh !== secondLogin.token.refresh,
  );
  TestValidator.predicate(
    "third login access token differs from first login",
    thirdLogin.token.access !== secondSessionTokens.access,
  );
  TestValidator.predicate(
    "third login access token differs from registration",
    thirdLogin.token.access !== firstSessionTokens.access,
  );

  // Verify user identity remains the same across all sessions
  TestValidator.equals(
    "user id consistent across sessions",
    firstLogin.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "user id consistent in second login",
    secondLogin.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "user id consistent in third login",
    thirdLogin.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "email consistent across sessions",
    firstLogin.email,
    userEmail,
  );
}
