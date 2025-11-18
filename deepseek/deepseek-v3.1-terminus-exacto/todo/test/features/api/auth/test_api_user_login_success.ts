import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates user login with correct credentials after registration.
 *
 * 1. Register a new user account (with random, valid email and password).
 * 2. Attempt to login using those same credentials, supplying a random
 *    href/referrer.
 * 3. Assert the login response includes a valid access/refresh token pair, correct
 *    user id/email, locked=false, and correct timestamps (created_at,
 *    updated_at present, deleted_at null/undefined).
 * 4. Assert all returned fields match those from registration and business rules
 *    (active user, not locked or deleted, timestamps present).
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // 1. Register a new user
  const email = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
  >();
  const createBody = {
    email,
    password,
  } satisfies ITodoListUser.ICreate;
  const registered = await api.functional.auth.user.join(connection, {
    body: createBody,
  });
  typia.assert(registered);

  // 2. Login with correct credentials (using random href/referrer)
  const loginBody = {
    email: email as string & tags.Format<"email">,
    password: password as string & tags.Format<"password">,
    // Both URIs, required per DTO definition
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ILogin;
  const loggedIn = await api.functional.auth.user.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedIn);

  // 3. Assert JWT tokens, user metadata, and session correctness
  TestValidator.equals("user id matches", loggedIn.id, registered.id);
  TestValidator.equals("user email matches", loggedIn.email, email);
  TestValidator.equals("locked is false", loggedIn.locked, false);
  TestValidator.equals(
    "deleted_at is null or undefined",
    loggedIn.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof loggedIn.created_at === "string" && loggedIn.created_at.length > 10,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof loggedIn.updated_at === "string" && loggedIn.updated_at.length > 10,
  );

  typia.assert<IAuthorizationToken>(loggedIn.token);
  TestValidator.predicate(
    "access token non-empty",
    typeof loggedIn.token.access === "string" &&
      loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token non-empty",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at present",
    typeof loggedIn.token.expired_at === "string" &&
      loggedIn.token.expired_at.length > 10,
  );
  TestValidator.predicate(
    "refreshable_until present",
    typeof loggedIn.token.refreshable_until === "string" &&
      loggedIn.token.refreshable_until.length > 10,
  );
}
