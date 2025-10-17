import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test the administrator login workflow using valid email and password
 * credentials.
 *
 * This test covers the complete login process for an administrator user.
 *
 * Steps:
 *
 * 1. Register a new administrator account (/auth/admin/join) with unique email and
 *    hashed password.
 * 2. Perform login (/auth/admin/login) using the registered email and plain
 *    password.
 * 3. Verify successful login by asserting the returned JWT tokens in the response.
 * 4. Validate that the administrator info matches the created account.
 *
 * This test ensures administrators can securely authenticate with valid
 * credentials and receive proper tokens for session management.
 */
export async function test_api_admin_authentication_with_email_and_password(
  connection: api.IConnection,
) {
  // 1. Register a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITodoListAdmin.ICreate;

  const adminAuthorized: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // 2. Login as the registered administrator
  const adminLoginBody = {
    email: adminEmail,
    password: "1234",
  } satisfies ITodoListAdmin.ILogin;

  const adminLoggedIn: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);

  // 3. Validate the login response tokens
  TestValidator.predicate(
    "access token should be a non-empty string",
    typeof adminLoggedIn.token.access === "string" &&
      adminLoggedIn.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be a non-empty string",
    typeof adminLoggedIn.token.refresh === "string" &&
      adminLoggedIn.token.refresh.length > 0,
  );

  // 4. Validate the admin properties
  TestValidator.equals(
    "admin email should match",
    adminLoggedIn.email,
    adminEmail,
  );
  TestValidator.predicate(
    "admin id should be a non-empty string",
    typeof adminLoggedIn.id === "string" && adminLoggedIn.id.length > 0,
  );
  TestValidator.predicate(
    "token expired_at should be a valid ISO date string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      adminLoggedIn.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token refreshable_until should be a valid ISO date string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      adminLoggedIn.token.refreshable_until,
    ),
  );
}
