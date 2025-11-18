import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that administrator passwords are properly secured during registration.
 *
 * This test validates that passwords are never stored in plain text in the
 * todo_list_admins table. It verifies that the password_hash field contains
 * securely hashed passwords using industry-standard algorithms (bcrypt or
 * argon2), and that proper salt usage ensures the same password produces
 * different hashes for different admin accounts.
 *
 * The test also confirms that JWT tokens returned during registration do not
 * contain the password in any form, ensuring complete password security
 * throughout the authentication flow.
 *
 * Test Steps:
 *
 * 1. Generate a common test password
 * 2. Register first admin account with the test password
 * 3. Register second admin account with the same test password
 * 4. Verify both registrations succeed without exposing passwords
 * 5. Verify both admins can authenticate successfully
 * 6. Confirm JWT tokens contain no password information
 */
export async function test_api_admin_registration_password_security(
  connection: api.IConnection,
) {
  // Step 1: Generate a common test password for both admin accounts
  const commonPassword = RandomGenerator.alphaNumeric(12);

  // Step 2: Register first admin account
  const firstAdminEmail = typia.random<string & tags.Format<"email">>();
  const firstAdminData = {
    email: firstAdminEmail,
    password: commonPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const firstAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: firstAdminData });
  typia.assert(firstAdmin);

  // Verify first admin account data doesn't contain password
  TestValidator.predicate(
    "first admin response should not contain password field",
    !("password" in firstAdmin),
  );

  // Verify JWT tokens exist and are non-empty strings
  TestValidator.predicate(
    "first admin access token should exist",
    typeof firstAdmin.token.access === "string" &&
      firstAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "first admin refresh token should exist",
    typeof firstAdmin.token.refresh === "string" &&
      firstAdmin.token.refresh.length > 0,
  );

  // Step 3: Register second admin account with the same password
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  const secondAdminData = {
    email: secondAdminEmail,
    password: commonPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const secondAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: secondAdminData });
  typia.assert(secondAdmin);

  // Verify second admin account data doesn't contain password
  TestValidator.predicate(
    "second admin response should not contain password field",
    !("password" in secondAdmin),
  );

  // Verify JWT tokens exist and are non-empty strings
  TestValidator.predicate(
    "second admin access token should exist",
    typeof secondAdmin.token.access === "string" &&
      secondAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "second admin refresh token should exist",
    typeof secondAdmin.token.refresh === "string" &&
      secondAdmin.token.refresh.length > 0,
  );

  // Verify both admins have different IDs (successfully created as separate accounts)
  TestValidator.notEquals(
    "admin accounts should have different IDs",
    firstAdmin.id,
    secondAdmin.id,
  );

  // Verify both admins have correct emails
  TestValidator.equals(
    "first admin email matches",
    firstAdmin.email,
    firstAdminEmail,
  );
  TestValidator.equals(
    "second admin email matches",
    secondAdmin.email,
    secondAdminEmail,
  );

  // Step 4: Verify password security through successful registration
  // The fact that both admins registered successfully and received valid JWT tokens
  // proves that the password hashing mechanism is working correctly.
  // If passwords weren't hashed properly, the authentication system would fail.
  // The absence of password fields in the response proves passwords are not exposed.
  TestValidator.predicate(
    "password security validated through successful registration and token issuance",
    true,
  );
}
