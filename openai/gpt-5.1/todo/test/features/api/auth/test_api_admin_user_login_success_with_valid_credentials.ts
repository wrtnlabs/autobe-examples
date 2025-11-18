import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate successful admin user login with valid credentials and context
 * metadata.
 *
 * Business intent
 *
 * - Ensure that POST /auth/adminUser/login accepts a well-formed
 *   ITodoAppAdminUser.ILogin payload and returns ITodoAppAdminUser.IAuthorized
 *   for an existing active admin.
 * - Confirm that the returned token structure (IAuthorizationToken) is
 *   well-formed and logically consistent for subsequent admin API calls.
 *
 * Test flow
 *
 * 1. Prepare an ITodoAppAdminUser.ILogin payload with realistic values:
 *
 *    - Email/password pair assumed to be valid for a pre-seeded admin user.
 *    - Href/referrer as valid URI strings.
 *    - Ip optionally populated with a plausible IP string.
 * 2. Call api.functional.auth.adminUser.login with the login payload.
 * 3. Assert that the response conforms to ITodoAppAdminUser.IAuthorized using
 *    typia.assert.
 * 4. Perform additional logical assertions:
 *
 *    - Token.access and token.refresh are non-empty strings.
 *    - Token.expired_at and token.refreshable_until are valid date-time strings
 *         (typia.assert covers this).
 *    - Id, email, status, created_at, updated_at are present and stable (no DB
 *         equality, only structural checks).
 * 5. Do not touch connection.headers at all; header wiring is validated indirectly
 *    by SDK behavior.
 */
export async function test_api_admin_user_login_success_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Prepare a realistic login payload
  const loginBody = {
    email: "admin@example.com",
    password: "AdminPassword123!",
    ip: "203.0.113.42",
    href: "https://admin.todo-app.example.com/login",
    referrer: "https://admin.todo-app.example.com/",
  } satisfies ITodoAppAdminUser.ILogin;

  // 2. Call the admin login endpoint
  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: loginBody,
    });

  // 3. Strongly assert the response type shape
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorized);

  // 4. Additional logical assertions on token and identity fields
  const token: IAuthorizationToken = authorized.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token must be a non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be a non-empty string",
    token.refresh.length > 0,
  );

  TestValidator.predicate(
    "admin id must be a non-empty string",
    authorized.id.length > 0,
  );
  TestValidator.predicate(
    "admin email in response must match login email",
    () => authorized.email === loginBody.email,
  );

  TestValidator.predicate(
    "admin status must be a non-empty string",
    authorized.status.length > 0,
  );
  TestValidator.predicate(
    "created_at must be a non-empty date-time string",
    authorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty date-time string",
    authorized.updated_at.length > 0,
  );
}
