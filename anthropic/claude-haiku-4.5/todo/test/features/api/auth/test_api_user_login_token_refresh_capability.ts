import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_login_token_refresh_capability(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for testing
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);

  const createUserBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppUser.ICreate;

  const createdUser = await api.functional.auth.user.join(connection, {
    body: createUserBody,
  });
  typia.assert(createdUser);
  TestValidator.equals("created user email matches", createdUser.email, email);

  // Step 2: Log in with the created user credentials
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppUser.ILogin;

  const loggedInUser = await api.functional.auth.user.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedInUser);

  // Step 3: Verify token structure and expiration times
  const token = loggedInUser.token;
  typia.assert(token);

  // Verify token has required fields
  TestValidator.predicate(
    "access token is non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.refreshable_until),
  );

  // Step 4: Verify that refreshable_until extends beyond expired_at
  const accessTokenExpiration = new Date(token.expired_at);
  const refreshTokenExpiration = new Date(token.refreshable_until);

  TestValidator.predicate(
    "refresh token expiration extends beyond access token expiration",
    refreshTokenExpiration.getTime() > accessTokenExpiration.getTime(),
  );

  // Step 5: Verify tokens are valid JWT format (basic structure check)
  const jwtRegex = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  TestValidator.predicate(
    "access token has valid JWT format",
    jwtRegex.test(token.access),
  );
  TestValidator.predicate(
    "refresh token has valid JWT format",
    jwtRegex.test(token.refresh),
  );

  // Step 6: Verify user information in response
  TestValidator.equals(
    "logged in user email matches",
    loggedInUser.email,
    email,
  );
  TestValidator.equals(
    "logged in user id matches created user id",
    loggedInUser.id,
    createdUser.id,
  );
}
