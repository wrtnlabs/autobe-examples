import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate registration (join) followed by successful login.
 *
 * Business purpose:
 *
 * - Ensure that a newly created user can authenticate immediately.
 * - Verify that the login response issues authorization tokens and updates
 *   server-side timestamps (updated_at / last_active_at) relative to creation.
 * - Ensure no sensitive fields (password or password_hash) are leaked in
 *   responses.
 *
 * Test steps:
 *
 * 1. Generate unique credentials (email + password). Password length >= 8.
 * 2. POST /auth/user/join with ITodoAppUser.ICreate and assert the created
 *    ITodoAppUser.IAuthorized response.
 * 3. POST /auth/user/login with ITodoAppUser.ILogin using the same credentials and
 *    assert the returned ITodoAppUser.IAuthorized response.
 * 4. Validate:
 *
 *    - Login response contains token.access and token.refresh (non-empty strings)
 *    - Token.expired_at and token.refreshable_until are ISO 8601 strings
 *    - Returned user id equals created user id
 *    - Updated_at (from login response) is >= created_at (from join response)
 *    - No plaintext password or password_hash properties are present in responses
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // 1) Prepare deterministic, valid credentials
  const password = RandomGenerator.alphaNumeric(12); // >= 8 chars
  const email = typia.random<string & tags.Format<"email">>();
  const display_name = RandomGenerator.name();

  const joinBody = {
    email,
    password,
    display_name,
  } satisfies ITodoAppUser.ICreate;

  // 2) Register the new user
  const created: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: joinBody,
    },
  );
  // Validate response shape and values
  typia.assert(created);

  // Basic expectations about created record
  TestValidator.predicate(
    "created response contains created_at",
    typeof created.created_at === "string" &&
      !Number.isNaN(Date.parse(created.created_at)),
  );

  // 3) Login using the same credentials
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITodoAppUser.ILogin;

  const logged: ITodoAppUser.IAuthorized = await api.functional.auth.user.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(logged);

  // 4) Business assertions
  // 4.1 User identity
  TestValidator.equals("user id matches after login", logged.id, created.id);

  // 4.2 Tokens are present and non-empty
  TestValidator.predicate(
    "access token present and non-empty",
    typeof logged.token?.access === "string" && logged.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present and non-empty",
    typeof logged.token?.refresh === "string" &&
      logged.token.refresh.length > 0,
  );

  // 4.3 Token expiry fields are valid ISO date-times
  TestValidator.predicate(
    "token.expired_at is ISO 8601",
    typeof logged.token.expired_at === "string" &&
      !Number.isNaN(Date.parse(logged.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO 8601",
    typeof logged.token.refreshable_until === "string" &&
      !Number.isNaN(Date.parse(logged.token.refreshable_until)),
  );

  // 4.4 Timestamps: updated_at (login) >= created_at (join)
  TestValidator.predicate(
    "created_at is ISO 8601",
    typeof created.created_at === "string" &&
      !Number.isNaN(Date.parse(created.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    typeof logged.updated_at === "string" &&
      !Number.isNaN(Date.parse(logged.updated_at)),
  );

  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    Date.parse(logged.updated_at) >= Date.parse(created.created_at),
  );

  // 4.5 Ensure sensitive fields are not leaked
  TestValidator.predicate(
    "password not present in login response",
    !("password" in logged),
  );
  TestValidator.predicate(
    "password_hash not present in login response",
    !("password_hash" in logged),
  );

  // 4.6 Optional: if user summary exists, ensure its id matches
  if (logged.user !== undefined && logged.user !== null) {
    TestValidator.equals(
      "user summary id matches created id",
      logged.user.id,
      created.id,
    );
  }
}
