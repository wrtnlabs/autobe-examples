import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Perform administrator signup followed by authentication login.
 *
 * The test first registers a new administrator using the join API, providing a
 * securely generated email and password hash. It then logs in with the plain
 * email and password.
 *
 * The responses must be fully validated to conform to the
 * ITodoListAdmin.IAuthorized DTO. The process tests the core authentication
 * flow for admin user accounts.
 */
export async function test_api_admin_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // Step 1. Generate realistic valid admin email
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  // Step 2. Generate a password and hash
  const rawPassword = "StrongP@ssw0rd"; // Plain password to use in login
  // For join, password_hash must be a hashed string. Without a real hasher, using a mock hash string here.
  // The API expects password_hash to be a string (no format), so a UUID string can be used as mock.
  const passwordHash = typia.random<string>();

  // Step 3. Admin join operation
  const joined: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(joined);

  // Validate returned joined admin email equals the input email
  TestValidator.equals(
    "admin email after join should match",
    joined.email,
    adminEmail,
  );

  // Step 4. Admin login operation using plain email and password
  const loggedIn: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: rawPassword,
      } satisfies ITodoListAdmin.ILogin,
    });
  typia.assert(loggedIn);

  // Validate login email matches the registered admin email
  TestValidator.equals(
    "admin email after login should match",
    loggedIn.email,
    adminEmail,
  );

  // Validate that the token object exists and contains access string
  TestValidator.predicate(
    "login response contains token access string",
    typeof loggedIn.token.access === "string" &&
      loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response contains token refresh string",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login response contains expired_at datetime string",
    typeof loggedIn.token.expired_at === "string" &&
      loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "login response contains refreshable_until datetime string",
    typeof loggedIn.token.refreshable_until === "string" &&
      loggedIn.token.refreshable_until.length > 0,
  );
  // Additional verification of created_at and updated_at timestamps
  TestValidator.predicate(
    "joined response has valid created_at",
    typeof joined.created_at === "string" && joined.created_at.length > 0,
  );
  TestValidator.predicate(
    "joined response has valid updated_at",
    typeof joined.updated_at === "string" && joined.updated_at.length > 0,
  );
}
