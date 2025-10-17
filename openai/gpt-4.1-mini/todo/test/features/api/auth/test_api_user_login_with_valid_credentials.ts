import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Tests the login process for a registered user by providing valid email and
 * password credentials.
 *
 * The test performs the following steps:
 *
 * 1. Register a new user via the join API with a random but valid email and
 *    password.
 * 2. Attempt login using the same email and password.
 * 3. Validate that the login response returns the same user ID as registration and
 *    includes valid JWT access and refresh tokens.
 * 4. Use typia.assert to ensure the integrity of the DTO objects received.
 * 5. Ensure no errors occur during any API calls.
 */
export async function test_api_user_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. User join: Register a new user with valid credentials
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListUser.ICreate;

  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreateBody });
  typia.assert(joinResponse);

  // 2. User login: Login with the same credentials as used in join
  const loginBody = {
    email: userCreateBody.email,
    password: userCreateBody.password,
  } satisfies ITodoListUser.ILogin;

  const loginResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, { body: loginBody });
  typia.assert(loginResponse);

  // 3. Validate that the user IDs match
  TestValidator.equals(
    "login user ID matches join user ID",
    loginResponse.id,
    joinResponse.id,
  );

  // 4. Validate that the tokens exist and have string values
  TestValidator.predicate(
    "login response has valid access token",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response has valid refresh token",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );

  // 5. Validate that the tokens have valid ISO 8601 date strings for expiration
  const accessExpiry = loginResponse.token.expired_at;
  const refreshExpiry = loginResponse.token.refreshable_until;
  TestValidator.predicate(
    "access token expiration is ISO 8601",
    typeof accessExpiry === "string" && !isNaN(Date.parse(accessExpiry)),
  );
  TestValidator.predicate(
    "refresh token expiration is ISO 8601",
    typeof refreshExpiry === "string" && !isNaN(Date.parse(refreshExpiry)),
  );
}
