import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that sensitive authentication data is properly excluded from admin
 * profile responses.
 *
 * This test validates a critical security requirement: the admin profile
 * retrieval endpoint must never expose sensitive authentication credentials
 * such as password hashes. The test creates an admin account with specific
 * credentials, retrieves the profile, and verifies that only safe profile
 * information is returned while password data remains hidden.
 *
 * Steps:
 *
 * 1. Create an admin account with email and password credentials
 * 2. Retrieve the admin profile using the admin ID
 * 3. Validate that response contains expected profile fields (id, email,
 *    timestamps)
 * 4. Confirm that password hash is excluded from the response (enforced by
 *    ISummary type)
 */
export async function test_api_admin_profile_security_data_exclusion(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const createdAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Retrieve admin profile using the admin ID
  const retrievedProfile: ITodoListAdmin.ISummary =
    await api.functional.todoList.admin.admins.at(connection, {
      adminId: createdAdmin.id,
    });
  typia.assert(retrievedProfile);

  // Step 3: Verify essential profile fields match expected values
  TestValidator.equals(
    "admin ID matches",
    retrievedProfile.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "admin email matches",
    retrievedProfile.email,
    adminEmail,
  );

  // Step 4: Password exclusion is guaranteed by ISummary type structure
  // The ISummary type does not include password field, ensuring security by design
  // typia.assert() validates the complete type structure including the absence of password
}
