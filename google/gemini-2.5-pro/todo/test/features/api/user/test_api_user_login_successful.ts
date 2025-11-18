import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate successful user login.
 *
 * This test first registers a new user with random valid credentials and
 * required session context. It then attempts to log in using the same email and
 * password along with session context fields. It asserts that the login
 * response returns valid authorized user information and authorization tokens.
 * JWT tokens and user identity returned by login must be consistent and valid,
 * and all format-constrained types are verified by typia.
 */
export async function test_api_user_login_successful(
  connection: api.IConnection,
) {
  // Generate random session context values
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();
  const testIp = typia.random<string & tags.Format<"ipv4">>();

  // Generate user registration payload
  const email = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<256> & tags.Format<"email">
  >();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const registrationBody = {
    email,
    password,
    href: testHref,
    referrer: testReferrer,
    ip: testIp,
  } satisfies ITodoUser.ICreate;

  // Register the user
  const registrationResult = await api.functional.auth.user.join(connection, {
    body: registrationBody,
  });
  typia.assert(registrationResult);
  TestValidator.equals(
    "registration email equals input",
    registrationResult.email,
    email,
  );

  // Prepare login payload using the same session context fields
  const loginBody = {
    email,
    password,
    href: testHref,
    referrer: testReferrer,
    ip: testIp,
  } satisfies ITodoUser.ILogin;

  // Attempt to log in
  const loginResult = await api.functional.auth.user.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  // Validate returned user info and tokens
  TestValidator.equals("login email equals input", loginResult.email, email);
  TestValidator.equals(
    "login user id matches registration",
    loginResult.id,
    registrationResult.id,
  );
  TestValidator.predicate(
    "login response includes valid JWT access token",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response includes valid JWT refresh token",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login response token expiry is future date",
    Date.parse(loginResult.token.expired_at) > Date.now(),
  );
  TestValidator.predicate(
    "login response refreshable_until is future date",
    Date.parse(loginResult.token.refreshable_until) > Date.now(),
  );
}
