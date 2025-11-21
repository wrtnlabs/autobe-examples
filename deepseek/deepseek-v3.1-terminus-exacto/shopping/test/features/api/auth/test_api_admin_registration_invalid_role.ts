import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

/**
 * Test administrator registration with invalid role assignment.
 *
 * This test validates that the system properly rejects registration attempts
 * when an invalid role value is provided. The scenario involves creating
 * administrator registration data with a role that is not supported by the
 * system and verifying that the API returns an error response.
 */
export async function test_api_admin_registration_invalid_role(
  connection: api.IConnection,
) {
  // Generate valid administrator registration data
  const validAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: "super_admin", // Valid role from the DTO description
    permissions: JSON.stringify({ access: ["read", "write"] }),
    status: "pending_activation",
  } satisfies IShoppingMallAdministrator.ICreate;

  // Create invalid admin data by replacing role with unsupported value
  const invalidAdminData = {
    ...validAdminData,
    role: "invalid_role", // Invalid role that should be rejected
  } satisfies IShoppingMallAdministrator.ICreate;

  // Attempt to register administrator with invalid role
  await TestValidator.error(
    "registration with invalid role should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: invalidAdminData,
      });
    },
  );

  // Verify that valid role registration works correctly
  const validResponse = await api.functional.auth.admin.join(connection, {
    body: validAdminData,
  });
  typia.assert(validResponse);

  TestValidator.equals(
    "valid registration should return authorized response",
    validResponse.administrator.role,
    "super_admin",
  );
}
