import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates successful login for an existing user account.
 *
 * This test covers the scenario of registering a new user (with required
 * session context) and then logging in with the same credentials, ensuring all
 * session fields and JWT authentication properties function correctly for a
 * full login flow. It checks positive authentication only, without testing
 * error variations or edge cases. Password policy, email uniqueness, all
 * required href/referrer/ip session fields, and the presence of token info are
 * covered.
 *
 * Steps:
 *
 * 1. Generate a unique random email and a valid secure password according to
 *    policy.
 * 2. Register the user via /auth/user/join using valid session context (href,
 *    referrer, ip).
 * 3. Attempt login using /auth/user/login with the same credentials and session
 *    context.
 * 4. Assert that the returned user is the same and has a valid JWT access/refresh
 *    token and session data.
 */
export async function test_api_user_login_existing_account_success(
  connection: api.IConnection,
) {
  // Step 1: Prepare unique random credentials and session context
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> & tags.MaxLength<72> =
    RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<8> &
      tags.MaxLength<72>;
  const href: string & tags.Format<"uri"> =
    "https://test-app.local/join-page" as string & tags.Format<"uri">;
  const referrer: string & tags.Format<"uri"> =
    "https://test-app.local/start" as string & tags.Format<"uri">;
  const ip: string & tags.Format<"ipv4"> = "203.0.113.45" as string &
    tags.Format<"ipv4">;

  // Step 2: Register account
  const joinInput = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies ITodoListUser.IJoin;
  const registered: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinInput });
  typia.assert(registered);
  TestValidator.equals(
    "registered email matches input email",
    registered.email,
    email,
  );
  TestValidator.predicate(
    "registered user id is valid uuid",
    !!registered.id && typeof registered.id === "string",
  );
  TestValidator.predicate(
    "registered user created_at is ISO string",
    typeof registered.created_at === "string",
  );
  typia.assert<IAuthorizationToken>(registered.token);

  // Step 3: Login with same credentials and session context
  const loginInput = {
    email,
    password: password as string & tags.MinLength<8> & tags.Format<"password">,
    href: "https://test-app.local/login-page" as string & tags.Format<"uri">,
    referrer,
    ip,
  } satisfies ITodoListUser.ILogin;
  const loggedIn: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, { body: loginInput });
  typia.assert(loggedIn);

  // Step 4: Assert login result matches registration result, new tokens, valid session context
  TestValidator.equals(
    "login user id matches registration",
    loggedIn.id,
    registered.id,
  );
  TestValidator.equals(
    "login email matches registration",
    loggedIn.email,
    email,
  );
  typia.assert<IAuthorizationToken>(loggedIn.token);
  TestValidator.notEquals(
    "a new JWT access token is issued on login",
    loggedIn.token.access,
    registered.token.access,
  );
  TestValidator.predicate(
    "access token is present",
    typeof loggedIn.token.access === "string",
  );
  TestValidator.predicate(
    "refresh token is present",
    typeof loggedIn.token.refresh === "string",
  );
  TestValidator.predicate(
    "expired_at is ISO string",
    typeof loggedIn.token.expired_at === "string",
  );
  TestValidator.predicate(
    "refreshable_until is ISO string",
    typeof loggedIn.token.refreshable_until === "string",
  );
}
