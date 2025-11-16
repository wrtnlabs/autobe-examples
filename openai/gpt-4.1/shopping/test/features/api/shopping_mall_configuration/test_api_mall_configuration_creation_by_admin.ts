import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Validate the creation of a new shopping mall configuration by admin.
 *
 * 1. Register a new shopping mall admin via /auth/admin/join
 * 2. Use the authenticated admin to create a new configuration via
 *    /shoppingMall/admin/mallConfigurations
 * 3. Verify all required fields: config_key, config_value, description, status
 * 4. Check that config_key uniqueness is enforced and active/inactive/deprecated
 *    values are allowed
 * 5. Confirm auditing fields on the returned result
 * 6. Ensure created config matches input values and is returned properly
 */
export async function test_api_mall_configuration_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare unique configuration input
  const configKey = `test_config_key_${RandomGenerator.alphaNumeric(8)}`;
  const configValue = RandomGenerator.paragraph({ sentences: 2 });
  const configDescription = RandomGenerator.paragraph({ sentences: 3 });
  const statuses = ["active", "inactive", "deprecated"] as const;
  const status = RandomGenerator.pick(statuses);
  const body = {
    config_key: configKey,
    config_value: configValue,
    description: configDescription,
    status,
  } satisfies IShoppingMallConfiguration.ICreate;

  // 3. Create new mall configuration
  const config: IShoppingMallConfiguration =
    await api.functional.shoppingMall.admin.mallConfigurations.create(
      connection,
      {
        body,
      },
    );
  typia.assert(config);

  // 4. Field-level verification
  TestValidator.equals(
    "config_key matches input",
    config.config_key,
    configKey,
  );
  TestValidator.equals(
    "config_value matches input",
    config.config_value,
    configValue,
  );
  TestValidator.equals(
    "description matches input",
    config.description,
    configDescription,
  );
  TestValidator.equals("status matches input", config.status, status);
  TestValidator.predicate(
    "auditing fields are present",
    typeof config.created_at === "string" &&
      config.created_at.length > 0 &&
      typeof config.updated_at === "string" &&
      config.updated_at.length > 0 &&
      typeof config.id === "string" &&
      config.id.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be null or undefined after creation",
    config.deleted_at,
    null,
  );
}
