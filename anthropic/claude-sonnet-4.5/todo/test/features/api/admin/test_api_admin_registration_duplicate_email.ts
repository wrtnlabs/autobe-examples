import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator registration duplicate email enforcement.
 *
 * This test validates that the admin registration endpoint properly enforces
 * email uniqueness constraints. It verifies that attempting to register
 * multiple admin accounts with the same email address (including
 * case-insensitive variants) is correctly rejected by the system.
 *
 * Steps:
 *
 * 1. Generate a unique random email for testing
 * 2. Successfully register the first admin with this email
 * 3. Validate the registration response contains admin data and JWT tokens
 * 4. Attempt to register a second admin with the exact same email (should fail)
 * 5. Attempt to register with same email but different casing (should also fail)
 * 6. Verify that duplicate attempts are rejected with appropriate errors
 */
export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Generate test data
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(12);
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();

  // Step 2: Create the first admin account (should succeed)
  const firstAdminBody = {
    email: testEmail,
    password: testPassword,
    href: testHref,
    referrer: testReferrer,
  } satisfies ITodoListAdmin.ICreate;

  const firstAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: firstAdminBody,
    });

  // Step 3: Validate successful registration
  typia.assert(firstAdmin);
  TestValidator.equals(
    "first admin email matches",
    firstAdmin.email,
    testEmail.toLowerCase(),
  );
  TestValidator.predicate(
    "first admin has valid UUID",
    firstAdmin.id.length > 0,
  );
  TestValidator.predicate(
    "first admin has access token",
    firstAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "first admin has refresh token",
    firstAdmin.token.refresh.length > 0,
  );

  // Step 4: Attempt to register second admin with exact same email (should fail)
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: testEmail,
          password: RandomGenerator.alphaNumeric(12),
          href: testHref,
          referrer: testReferrer,
        } satisfies ITodoListAdmin.ICreate,
      });
    },
  );

  // Step 5: Attempt to register with same email but different casing (should also fail)
  const uppercaseEmail = testEmail.toUpperCase();
  await TestValidator.error(
    "case-insensitive duplicate email should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: uppercaseEmail,
          password: RandomGenerator.alphaNumeric(12),
          href: testHref,
          referrer: testReferrer,
        } satisfies ITodoListAdmin.ICreate,
      });
    },
  );
}
