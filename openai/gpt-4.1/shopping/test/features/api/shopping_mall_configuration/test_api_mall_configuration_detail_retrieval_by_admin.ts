import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Retrieve and validate shopping mall configuration details by admin
 *
 * 1. Register a new admin using random credentials
 * 2. For each status ('active', 'inactive', 'deprecated'):
 *
 *    - Create a config entry with unique config_key/value/description, status
 *    - Retrieve config detail by config_key
 *    - Validate properties: id, config_key, config_value, description, status,
 *         created_at, updated_at, (deleted_at is absent)
 *    - Ensure all values match creation input and audit info is present
 * 3. Attempt retrieval of a config entry with no admin auth; check error occurs
 */
export async function test_api_mall_configuration_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin (auth context)
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

  // 2. Create and test configuration entries with each status
  const statuses = ["active", "inactive", "deprecated"] as const;
  for (const status of statuses) {
    const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}_${status}`;
    const configValue = RandomGenerator.alphaNumeric(24);
    const configDescription = RandomGenerator.paragraph({ sentences: 4 });
    // Create config entry
    const created: IShoppingMallConfiguration =
      await api.functional.shoppingMall.admin.mallConfigurations.create(
        connection,
        {
          body: {
            config_key: configKey,
            config_value: configValue,
            description: configDescription,
            status,
          } satisfies IShoppingMallConfiguration.ICreate,
        },
      );
    typia.assert(created);
    // Retrieve config entry by key
    const detail: IShoppingMallConfiguration =
      await api.functional.shoppingMall.admin.mallConfigurations.at(
        connection,
        {
          configKey,
        },
      );
    typia.assert(detail);
    // Validate all properties
    TestValidator.equals("config key matches", detail.config_key, configKey);
    TestValidator.equals(
      "config value matches",
      detail.config_value,
      configValue,
    );
    TestValidator.equals(
      "description matches",
      detail.description,
      configDescription,
    );
    TestValidator.equals("status matches", detail.status, status);
    TestValidator.predicate(
      "id is uuid",
      typeof detail.id === "string" && !!detail.id && detail.id.length === 36,
    );
    TestValidator.predicate(
      "created_at is ISO",
      typeof detail.created_at === "string" && detail.created_at.endsWith("Z"),
    );
    TestValidator.predicate(
      "updated_at is ISO",
      typeof detail.updated_at === "string" && detail.updated_at.endsWith("Z"),
    );
    TestValidator.equals(
      "deleted_at should be null or undefined",
      detail.deleted_at,
      null,
    );
  }
  // 3. Create unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const testConfigKey = `test_config_${RandomGenerator.alphaNumeric(8)}_active`;
  await TestValidator.error(
    "unauthorized should fail config retrieval",
    async () => {
      await api.functional.shoppingMall.admin.mallConfigurations.at(
        unauthConn,
        {
          configKey: testConfigKey,
        },
      );
    },
  );
}
