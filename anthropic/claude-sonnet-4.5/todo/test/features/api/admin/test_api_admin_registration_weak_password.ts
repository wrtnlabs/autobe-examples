import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test admin registration rejection when password does not meet minimum
 * security requirements.
 *
 * This test validates that the admin registration endpoint properly enforces
 * password strength requirements by rejecting passwords that fail to meet the
 * minimum security criteria. Specifically, it tests that passwords shorter than
 * 8 characters (the minimum length requirement defined in
 * ITodoListAdmin.ICreate) are rejected with appropriate validation errors.
 *
 * Steps:
 *
 * 1. Generate valid registration data (email, session context)
 * 2. Create a weak password that violates the minimum length constraint (< 8
 *    characters)
 * 3. Attempt to register an admin account with the weak password
 * 4. Verify that the registration fails with a validation error
 *
 * This ensures the endpoint enforces password security policies for
 * administrator accounts and prevents the creation of admin accounts with weak
 * passwords that could compromise system security.
 */
export async function test_api_admin_registration_weak_password(
  connection: api.IConnection,
) {
  // Generate a weak password that violates the MinLength<8> constraint
  const weakPassword = RandomGenerator.alphabets(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<7>
    >(),
  );

  // Prepare registration data with the weak password
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: weakPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  // Attempt registration with weak password and expect it to fail
  await TestValidator.error(
    "admin registration should fail with weak password",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: registrationData,
      });
    },
  );
}
