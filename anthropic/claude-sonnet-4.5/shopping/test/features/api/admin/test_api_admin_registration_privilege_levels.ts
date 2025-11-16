import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test administrator registration with all available privilege levels.
 *
 * This test validates that admin accounts can be created with each of the three
 * privilege levels (super_admin, moderator, support) and that each registration
 * correctly reflects the specified privilege level in the response.
 *
 * Process:
 *
 * 1. Create a super_admin account and verify the privilege level
 * 2. Create a moderator account and verify the privilege level
 * 3. Create a support account and verify the privilege level
 * 4. Validate that all accounts receive proper authentication tokens
 * 5. Confirm that each privilege level is correctly stored and returned
 */
export async function test_api_admin_registration_privilege_levels(
  connection: api.IConnection,
) {
  // Define all three privilege levels to test
  const privilegeLevels = ["super_admin", "moderator", "support"] as const;

  // Test each privilege level
  for (const adminLevel of privilegeLevels) {
    // Generate unique test data for this admin account
    const adminData = {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: adminLevel,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate;

    // Register the admin account
    const registeredAdmin: IShoppingMallAdmin.IAuthorized =
      await api.functional.auth.admin.join(connection, {
        body: adminData,
      });

    // Validate response structure and type safety
    typia.assert(registeredAdmin);

    // Verify that the admin_level matches what was requested
    TestValidator.equals(
      `admin_level should be ${adminLevel}`,
      registeredAdmin.admin_level,
      adminLevel,
    );

    // Verify that essential fields are populated correctly
    TestValidator.equals(
      "email matches registration data",
      registeredAdmin.email,
      adminData.email,
    );

    TestValidator.equals(
      "full_name matches registration data",
      registeredAdmin.full_name,
      adminData.full_name,
    );

    TestValidator.equals(
      "phone_number matches registration data",
      registeredAdmin.phone_number,
      adminData.phone_number,
    );

    TestValidator.equals(
      "email_verified status matches registration data",
      registeredAdmin.email_verified,
      adminData.email_verified,
    );
  }
}
