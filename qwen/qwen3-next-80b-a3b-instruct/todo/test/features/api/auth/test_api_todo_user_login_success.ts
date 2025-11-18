import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test successful login for a registered todo user with strict GDPR, privacy,
 * and session enforcement.
 *
 * This test ensures:
 *
 * 1. Registration of a new user using unique email and password.
 * 2. Login using the registered credentials, providing required session context
 *    fields (href/referrer).
 * 3. Verification that the response includes JWT and refresh tokens, valid
 *    timestamps, and correct business fields.
 * 4. Enforcement of login only for non-deleted, active users.
 * 5. Data minimization and privacy/GDPR policies—returned DTO does not expose any
 *    fields except those allowed by ITodoUser.IAuthorized.
 * 6. Inaccessibility of login for deleted/inactive users (not covered here—see
 *    negative tests).
 *
 * Steps:
 *
 * - Register a user via /auth/user/join.
 * - Login the same user via /auth/user/login using same email/password and
 *   session metadata.
 * - Assert type and presence of id, email, created_at, updated_at, token fields,
 *   explicit absence of deleted_at, and nested token validity.
 */
export async function test_api_todo_user_login_success(
  connection: api.IConnection,
) {
  // Register a new unique user
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(12);
  const joinRequest = {
    email: joinEmail,
    password: joinPassword,
    ip: null,
    href: "https://app.todo.com/register",
    referrer: "https://app.todo.com/welcome",
  } satisfies ITodoUser.IJoin;
  const registered = await api.functional.auth.user.join(connection, {
    body: joinRequest,
  });
  typia.assert(registered);
  TestValidator.equals(
    "Created user email matches input",
    registered.email,
    joinEmail,
  );
  TestValidator.predicate(
    "deleted_at must be null or undefined",
    registered.deleted_at === null || registered.deleted_at === undefined,
  );
  TestValidator.predicate(
    "token field exists",
    typeof registered.token === "object" &&
      !!registered.token.access &&
      !!registered.token.refresh,
  );

  // Attempt login with the same credentials
  const loginRequest = {
    email: joinEmail,
    password: joinPassword as string & tags.Format<"password">,
    ip: undefined,
    href: "https://app.todo.com/login",
    referrer: "https://app.todo.com/register",
  } satisfies ITodoUser.ILogin;
  const loggedIn = await api.functional.auth.user.login(connection, {
    body: loginRequest,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "User id matches after login",
    loggedIn.id,
    registered.id,
  );
  TestValidator.equals(
    "User email matches after login",
    loggedIn.email,
    joinEmail,
  );
  TestValidator.predicate(
    "Login response does not expose deletion for active user",
    loggedIn.deleted_at === null || loggedIn.deleted_at === undefined,
  );
  TestValidator.equals(
    "User creation timestamp matches after login",
    loggedIn.created_at,
    registered.created_at,
  );
  TestValidator.predicate(
    "Session token field exists on login",
    typeof loggedIn.token === "object" &&
      !!loggedIn.token.access &&
      !!loggedIn.token.refresh,
  );
  typia.assert(loggedIn.token);
  TestValidator.predicate(
    "Access token must be non-empty string",
    typeof loggedIn.token.access === "string" &&
      loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "Refresh token must be non-empty string",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is valid ISO date string",
    typeof loggedIn.token.expired_at === "string" &&
      !Number.isNaN(Date.parse(loggedIn.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid ISO date string",
    typeof loggedIn.token.refreshable_until === "string" &&
      !Number.isNaN(Date.parse(loggedIn.token.refreshable_until)),
  );
}
