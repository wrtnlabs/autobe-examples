import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";

/**
 * Validate the successful refresh of tokens for a todoUser after login.
 *
 * The test ensures correct session lifecycle:
 *
 * - Registers a new todoUser (unique email, password)
 * - Logs in to obtain valid tokens in context of session creation
 * - Calls token refresh to get new access/refresh tokens
 * - Validates linkage (user ID, session traceability), token changes, audit field
 *   monotonicity
 * - All test data (email, password, URIs) are compliant and random
 */
export async function test_api_todouser_token_refresh_after_login(
  connection: api.IConnection,
) {
  // Step 1: Generate compliant random user registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const href =
    "https://todo-app.test/register/" + RandomGenerator.alphaNumeric(8);
  const referrer = "https://todo-app.test/landing";

  // Step 2: Register the user
  const joinPayload = {
    email,
    password,
    href,
    referrer,
  } satisfies ITodoListTodouser.IVerifyJoin;
  const joinResult = await api.functional.auth.todoUser.join(connection, {
    body: joinPayload,
  });
  typia.assert(joinResult);

  // Step 3: Log in to obtain initial tokens and session
  const loginPayload = {
    email,
    password,
    href: "https://todo-app.test/login/" + RandomGenerator.alphaNumeric(8),
    referrer: href,
  } satisfies ITodoListTodouser.IVerifyLogin;
  const loginResult = await api.functional.auth.todoUser.login(connection, {
    body: loginPayload,
  });
  typia.assert(loginResult);

  // Step 4: Use refresh token to obtain new tokens
  const refreshPayload = {
    refresh_token: loginResult.token.refresh,
  } satisfies ITodoListTodouser.IVerifyRefresh;
  const refreshResult = await api.functional.auth.todoUser.refresh(connection, {
    body: refreshPayload,
  });
  typia.assert(refreshResult);

  // Step 5: Assertions
  TestValidator.equals(
    "user ID must remain consistent after refresh",
    refreshResult.id,
    joinResult.id,
  );
  TestValidator.equals(
    "user email must remain consistent after refresh",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.predicate(
    "new access token after refresh must be different from login access token",
    refreshResult.token.access !== loginResult.token.access,
  );
  TestValidator.predicate(
    "new refresh token after refresh must be different from login refresh token",
    refreshResult.token.refresh !== loginResult.token.refresh,
  );
  TestValidator.predicate(
    "refreshed token expiry is after issue time",
    new Date(refreshResult.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshed refresh token expiry is after access expiry",
    new Date(refreshResult.token.refreshable_until).getTime() >=
      new Date(refreshResult.token.expired_at).getTime(),
  );
  TestValidator.equals(
    "token refresh does not create new user account",
    refreshResult.created_at,
    joinResult.created_at,
  );
  TestValidator.predicate(
    "user updated_at changes after refresh (session update)",
    new Date(refreshResult.updated_at).getTime() >=
      new Date(loginResult.updated_at).getTime(),
  );
}
