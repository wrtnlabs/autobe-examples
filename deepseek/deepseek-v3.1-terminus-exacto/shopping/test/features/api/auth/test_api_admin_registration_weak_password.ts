import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

/**
 * Test administrator registration with weak password that violates security
 * requirements.
 *
 * This test validates that the system properly enforces strong password
 * policies by rejecting registration attempts with insufficient password
 * strength. The test creates a valid administrator registration request with
 * all required fields populated correctly, but uses a weak password that does
 * not meet the platform's security requirements. The API should reject this
 * request and throw an error, demonstrating that password strength validation
 * is working correctly.
 */
export async function test_api_admin_registration_weak_password(
  connection: api.IConnection,
) {
  // Generate valid registration data with proper email, names, role, and permissions
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "123", // Weak password - too short and lacks complexity
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: "support_admin",
    permissions: JSON.stringify({
      user_management: true,
      content_management: false,
      system_configuration: false,
    }),
    status: "pending_activation",
  } satisfies IShoppingMallAdministrator.ICreate;

  // Attempt registration with weak password and verify it fails
  await TestValidator.error(
    "registration with weak password should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: registrationData,
      });
    },
  );
}
