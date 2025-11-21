import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

/**
 * Test administrator registration with duplicate email address.
 *
 * This test validates that the system properly rejects registration attempts
 * when an email address already exists in the system. The scenario involves:
 *
 * 1. Creating an initial admin account with a specific email address
 * 2. Attempting to register a second admin account using the same email address
 * 3. Verifying that the system returns an appropriate error response
 */
export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate a unique email address for testing
  const duplicateEmail = typia.random<string & tags.Format<"email">>();

  // Define admin registration data with specific role and permissions
  const adminData = {
    email: duplicateEmail,
    password: "TestPassword123!",
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: "support_admin",
    permissions: JSON.stringify({
      user_management: true,
      content_management: false,
      system_configuration: false,
    }),
    status: "active",
  } satisfies IShoppingMallAdministrator.ICreate;

  // Step 1: Create initial admin account to establish email duplication scenario
  const firstAdmin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(firstAdmin);

  // Verify the first admin was created successfully
  TestValidator.equals(
    "first admin email matches",
    firstAdmin.administrator.email,
    duplicateEmail,
  );

  // Create an unauthenticated connection for the duplicate attempt
  // This ensures we're testing email uniqueness, not authentication permissions
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 2: Attempt to create second admin with duplicate email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      return await api.functional.auth.admin.join(unauthConnection, {
        body: {
          ...adminData,
          first_name: RandomGenerator.name(), // Different first name
          last_name: RandomGenerator.name(), // Different last name
        } satisfies IShoppingMallAdministrator.ICreate,
      });
    },
  );
}
