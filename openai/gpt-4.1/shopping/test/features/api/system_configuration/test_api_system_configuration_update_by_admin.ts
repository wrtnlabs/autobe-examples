import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSystemConfiguration";

/**
 * Validate the update capability for admin system configuration entries.
 *
 * This test encompasses key system reliability and access control scenarios:
 *
 * - Registers a new admin and uses this session for privileged operations
 * - Simulates an existing configKey and updates its value/description as admin
 * - Immediately attempts a second update with the same config_value (idempotency
 *   check)
 * - Attempts to update a nonexistent configKey (should error)
 * - Tests that updates are denied to unauthenticated users
 */
export async function test_api_system_configuration_update_by_admin(
  connection: api.IConnection,
) {
  // Register a new admin to operate with admin privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: RandomGenerator.pick(["active", "pending", "suspended"] as const),
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Simulate an existing configuration (system may need setup for this test)
  // For this E2E, we use a fixed configKey and perform valid future updates
  const configKey = "core.smtp_server";
  const updatedValue = RandomGenerator.paragraph({ sentences: 5 });
  const updateBody = {
    config_value: updatedValue,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingSystemConfiguration.IUpdate;

  const updatedConfig: IShoppingSystemConfiguration =
    await api.functional.shopping.admin.systemConfigurations.update(
      connection,
      { configKey, body: updateBody },
    );
  typia.assert(updatedConfig);
  TestValidator.equals(
    "Config value is updated",
    updatedConfig.config_value,
    updatedValue,
  );
  if (updateBody.description !== undefined) {
    TestValidator.equals(
      "Description is updated",
      updatedConfig.description,
      updateBody.description,
    );
  }

  // Edge case: Update with the same value for idempotency/stability
  const updatedConfig2 =
    await api.functional.shopping.admin.systemConfigurations.update(
      connection,
      { configKey, body: updateBody },
    );
  typia.assert(updatedConfig2);
  TestValidator.equals(
    "Idempotent config value update succeeds",
    updatedConfig2.config_value,
    updatedValue,
  );
  if (updateBody.description !== undefined) {
    TestValidator.equals(
      "Idempotent config description update succeeds",
      updatedConfig2.description,
      updateBody.description,
    );
  }

  // Error handling: Attempt to update a non-existent configKey
  await TestValidator.error(
    "Updating nonexistent configKey should error",
    async () => {
      await api.functional.shopping.admin.systemConfigurations.update(
        connection,
        {
          configKey: "nonexistent_key_" + RandomGenerator.alphaNumeric(10),
          body: updateBody,
        },
      );
    },
  );

  // Permission enforcement: Use an unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated user cannot update system configuration",
    async () => {
      await api.functional.shopping.admin.systemConfigurations.update(
        unauthConn,
        { configKey, body: updateBody },
      );
    },
  );
}
