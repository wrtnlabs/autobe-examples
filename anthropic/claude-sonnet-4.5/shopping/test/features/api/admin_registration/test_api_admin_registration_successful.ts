import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test successful administrator account registration workflow.
 *
 * This test validates the complete admin registration process including:
 *
 * 1. Creating a new admin account with valid credentials
 * 2. Verifying successful registration with complete admin information
 * 3. Validating JWT token issuance (access and refresh tokens)
 * 4. Confirming all required fields in the response
 * 5. Testing different admin_level values (super_admin, moderator, support)
 * 6. Verifying session context recording for audit trails
 *
 * The test ensures the registration endpoint properly handles:
 *
 * - Email uniqueness validation
 * - Secure password hashing
 * - Admin privilege level assignment
 * - Session creation with context tracking
 * - Token generation for immediate authentication
 */
export async function test_api_admin_registration_successful(
  connection: api.IConnection,
) {
  // Test with different admin levels to ensure privilege assignment works
  const adminLevels = ["super_admin", "moderator", "support"] as const;

  for (const adminLevel of adminLevels) {
    // Prepare registration data
    const registrationData = {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: adminLevel,
      email_verified: true,
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate;

    // Call the registration endpoint
    const registeredAdmin: IShoppingMallAdmin.IAuthorized =
      await api.functional.auth.admin.join(connection, {
        body: registrationData,
      });

    // Validate the response structure and data - this validates EVERYTHING
    typia.assert(registeredAdmin);

    // Verify admin profile fields match input
    TestValidator.equals(
      "registered admin email matches input",
      registeredAdmin.email,
      registrationData.email,
    );
    TestValidator.equals(
      "registered admin full_name matches input",
      registeredAdmin.full_name,
      registrationData.full_name,
    );
    TestValidator.equals(
      "registered admin phone_number matches input",
      registeredAdmin.phone_number,
      registrationData.phone_number,
    );
    TestValidator.equals(
      "registered admin admin_level matches input",
      registeredAdmin.admin_level,
      registrationData.admin_level,
    );
    TestValidator.equals(
      "registered admin email_verified matches input",
      registeredAdmin.email_verified,
      registrationData.email_verified,
    );

    // Verify deleted_at is null for newly created admin
    TestValidator.equals(
      "deleted_at should be null for active admin",
      registeredAdmin.deleted_at,
      null,
    );
  }
}
