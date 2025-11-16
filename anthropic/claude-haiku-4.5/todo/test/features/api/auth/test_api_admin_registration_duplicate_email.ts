import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Validates email uniqueness constraint in admin registration.
 *
 * Tests that the admin registration endpoint properly enforces email uniqueness
 * by ensuring that duplicate email addresses are rejected. The test follows a
 * two-step process:
 *
 * 1. Register first admin account with a specific email address
 *
 *    - Creates a valid admin account
 *    - Receives authorization token upon successful registration
 *    - Validates the response contains proper admin data and tokens
 * 2. Attempt duplicate registration with same email
 *
 *    - Tries to create another admin account using the same email
 *    - Should fail with appropriate error response
 *    - Validates that the system rejects duplicate email registration
 *
 * This test ensures data integrity by confirming that email uniqueness is
 * enforced at the registration layer, preventing account conflicts and
 * maintaining system consistency.
 */
export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Register first admin account with specific email
  const firstAdminEmail = typia.random<string & tags.Format<"email">>();
  const firstAdminPassword = RandomGenerator.alphabets(10);

  const firstAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: firstAdminEmail,
        password: firstAdminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(firstAdmin);

  // Verify first admin registration was successful
  TestValidator.equals(
    "first admin email matches registered email",
    firstAdmin.email,
    firstAdminEmail,
  );
  TestValidator.predicate(
    "first admin has valid token",
    firstAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "first admin has valid refresh token",
    firstAdmin.token.refresh.length > 0,
  );

  // Step 2: Attempt to register another admin with the same email
  const secondAdminPassword = RandomGenerator.alphabets(10);

  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: firstAdminEmail, // Same email as first admin
          password: secondAdminPassword,
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );
}
