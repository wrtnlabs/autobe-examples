import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";

export async function test_api_shopping_mall_system_configuration_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin user (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "strongPassword123",
        ip: null,
        href: "https://example.com/admin/join",
        referrer: "https://example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create system configuration
  const configurationCreate: IShoppingMallSystemConfiguration.ICreate = {
    key: `test_config_key_${RandomGenerator.alphaNumeric(6)}`,
    value: `test_value_${RandomGenerator.alphaNumeric(12)}`,
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 6,
      wordMax: 12,
    }),
  } satisfies IShoppingMallSystemConfiguration.ICreate;
  const createdConfiguration: IShoppingMallSystemConfiguration =
    await api.functional.shoppingMall.admin.shoppingMallSystemConfigurations.create(
      connection,
      { body: configurationCreate },
    );
  typia.assert(createdConfiguration);

  // 3. Retrieve detailed info of the created system configuration by its ID
  const detail: IShoppingMallSystemConfiguration =
    await api.functional.shoppingMall.admin.shoppingMallSystemConfigurations.at(
      connection,
      { shoppingMallSystemConfigurationId: createdConfiguration.id },
    );
  typia.assert(detail);

  // 4. Validate that retrieved details match the created configuration
  TestValidator.equals(
    "created and retrieved configuration IDs must match",
    detail.id,
    createdConfiguration.id,
  );
  TestValidator.equals(
    "property 'key' must be equal",
    detail.key,
    configurationCreate.key,
  );
  TestValidator.equals(
    "property 'value' must be equal",
    detail.value,
    configurationCreate.value,
  );
  TestValidator.equals(
    "property 'description' must be equal",
    detail.description,
    configurationCreate.description,
  );

  TestValidator.predicate(
    "created_at must be ISO 8601 date-time string",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be ISO 8601 date-time string",
    typeof detail.updated_at === "string" && detail.updated_at.length > 0,
  );

  TestValidator.equals("deleted_at must be null", detail.deleted_at, null);
}
