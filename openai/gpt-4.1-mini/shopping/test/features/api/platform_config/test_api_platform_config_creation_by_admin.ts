import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformConfig";

export async function test_api_platform_config_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join to authenticate and obtain authorization
  const joinBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Password123!",
    full_name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new platform configuration
  const uniqueConfigName = `config_${RandomGenerator.alphaNumeric(10)}`;
  const createBody = {
    config_name: uniqueConfigName,
    config_value: RandomGenerator.alphaNumeric(20),
    description: "Test platform configuration created by e2e test",
  } satisfies IShoppingMallPlatformConfig.ICreate;

  const createdConfig: IShoppingMallPlatformConfig =
    await api.functional.shoppingMall.admin.platformConfigs.create(connection, {
      body: createBody,
    });
  typia.assert(createdConfig);

  TestValidator.equals(
    "created config config_name matches input",
    createdConfig.config_name,
    createBody.config_name,
  );
  TestValidator.equals(
    "created config config_value matches input",
    createdConfig.config_value,
    createBody.config_value,
  );
  TestValidator.predicate(
    "created config has created_at",
    createdConfig.created_at !== null && createdConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "created config has updated_at",
    createdConfig.updated_at !== null && createdConfig.updated_at !== undefined,
  );

  // 3. Attempt to create the same config name again to verify rejection
  await TestValidator.error(
    "duplicate config_name must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.platformConfigs.create(
        connection,
        {
          body: {
            config_name: uniqueConfigName,
            config_value: RandomGenerator.alphaNumeric(20),
            description: "Attempt duplicate config",
          } satisfies IShoppingMallPlatformConfig.ICreate,
        },
      );
    },
  );
}
