import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { prepare_random_shopping_mall_configuration } from "../../../prepare/prepare_random_shopping_mall_configuration";
import { generate_random_shopping_mall_admin_configurations_create } from "../../../generate/generate_random_shopping_mall_admin_configurations_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_configuration_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    },
  });
  // Create a configuration to be updated
  const config =
    await generate_random_shopping_mall_admin_configurations_create(
      adminConnection,
      {},
    );
  typia.assert(config);
  // Generate new values for update
  const newConfigValue = RandomGenerator.paragraph({ sentences: 1 });
  const newDescription = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  // Update the configuration with new values
  const updatedConfig =
    await api.functional.shoppingMall.admin.configurations.update(
      adminConnection,
      {
        configCode: config.config_code,
        body: {
          config_value: newConfigValue,
          description: newDescription,
        } satisfies IShoppingMallConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig);
  // Verify updated values
  TestValidator.equals(
    "updated config_value matches",
    newConfigValue,
    updatedConfig.config_value,
  );
  TestValidator.equals(
    "updated description matches",
    newDescription,
    updatedConfig.description,
  );
  TestValidator.equals(
    "config_code remains unchanged",
    config.config_code,
    updatedConfig.config_code,
  );
}
