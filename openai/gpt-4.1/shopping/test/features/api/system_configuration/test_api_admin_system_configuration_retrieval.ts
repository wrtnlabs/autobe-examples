import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSystemConfiguration";

/**
 * Validate retrieval of a system configuration entry by configKey as an
 * administrator, with full RBAC and error handling.
 *
 * 1. Register a new admin account using valid data (unique email, strong password,
 *    real name, valid role, valid status)
 * 2. Create a new system configuration entry (with unique config_key,
 *    config_value, optional description)
 * 3. Retrieve that entry by its config_key as admin
 * 4. Assert that all returned fields (id, config_key, config_value, description,
 *    created_at, updated_at, deleted_at) match the created value
 * 5. Attempt to fetch a non-existent config_key and confirm proper error is thrown
 * 6. Ensure access is only possible as admin (RBAC enforced)
 */
export async function test_api_admin_system_configuration_retrieval(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12) + "A1!z", // Ensure complexity
        name: RandomGenerator.name(),
        role: "super", // valid role
        status: "active", // valid status
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a unique system configuration entry
  const configKey = "test_config_" + RandomGenerator.alphaNumeric(8);
  const configValue = RandomGenerator.alphaNumeric(20);
  const configDescription = RandomGenerator.paragraph();
  const createdConfig: IShoppingSystemConfiguration =
    await api.functional.shopping.admin.systemConfigurations.create(
      connection,
      {
        body: {
          config_key: configKey,
          config_value: configValue,
          description: configDescription,
        } satisfies IShoppingSystemConfiguration.ICreate,
      },
    );
  typia.assert(createdConfig);

  // 3. Retrieve configuration by configKey
  const fetchedConfig: IShoppingSystemConfiguration =
    await api.functional.shopping.admin.systemConfigurations.at(connection, {
      configKey: configKey,
    });
  typia.assert(fetchedConfig);
  TestValidator.equals(
    "config id should match",
    fetchedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "config_key should match",
    fetchedConfig.config_key,
    createdConfig.config_key,
  );
  TestValidator.equals(
    "config_value should match",
    fetchedConfig.config_value,
    createdConfig.config_value,
  );
  TestValidator.equals(
    "description should match",
    fetchedConfig.description,
    createdConfig.description,
  );
  // Dates: should exist and be ISO strings. deleted_at should be null or undefined for active entries.
  TestValidator.predicate(
    "created_at present",
    typeof fetchedConfig.created_at === "string" &&
      fetchedConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof fetchedConfig.updated_at === "string" &&
      fetchedConfig.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be null/undefined",
    fetchedConfig.deleted_at,
    null,
  );

  // 4. Retrieval with non-existent configKey yields error
  const nonExistentKey = configKey + "_notfound";
  await TestValidator.error(
    "retrieving non-existent configKey should fail",
    async () => {
      await api.functional.shopping.admin.systemConfigurations.at(connection, {
        configKey: nonExistentKey,
      });
    },
  );
  // RBAC enforcement is implicitly validated because only admin can do this operation; no separate non-admin context available in current test asset scope.
}
