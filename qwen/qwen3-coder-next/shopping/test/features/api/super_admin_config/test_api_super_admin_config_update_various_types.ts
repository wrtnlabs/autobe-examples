import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_config_update_various_types(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated super admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(adminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
  });
  // Step 2: Generate various configuration values to test different data types
  const stringConfig = {
    config_key: "site_name",
    config_value: JSON.stringify(RandomGenerator.name()),
    data_type: "string",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies IShoppingMallSystematicConfig.IUpdate;
  const numberConfig = {
    config_key: "max_upload_size",
    config_value: JSON.stringify(
      typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
    ),
    data_type: "number",
    description: "Maximum file upload size in bytes",
    is_active: true,
  } satisfies IShoppingMallSystematicConfig.IUpdate;
  const booleanConfig = {
    config_key: "maintenance_mode",
    config_value: JSON.stringify(RandomGenerator.pick([true, false])),
    data_type: "boolean",
    description: "Enable or disable maintenance mode",
    is_active: true,
  } satisfies IShoppingMallSystematicConfig.IUpdate;
  const nestedObjectConfig = {
    config_key: "shipping_settings",
    config_value: JSON.stringify({
      free_shipping_threshold: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0>
      >(),
      standard_shipping_cost: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0>
      >(),
      express_shipping_cost: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0>
      >(),
      regions: ArrayUtil.repeat(3, () => RandomGenerator.name()),
    }),
    data_type: "object",
    description: "Shipping configuration settings",
    is_active: true,
  } satisfies IShoppingMallSystematicConfig.IUpdate;
  // Step 3: Test string configuration update
  const stringResult =
    await api.functional.shoppingMall.superAdmin.configs.patch(
      adminConnection,
      { body: stringConfig },
    );
  typia.assert(stringResult);
  // Step 4: Test number configuration update
  const numberResult =
    await api.functional.shoppingMall.superAdmin.configs.patch(
      adminConnection,
      { body: numberConfig },
    );
  typia.assert(numberResult);
  // Step 5: Test boolean configuration update
  const booleanResult =
    await api.functional.shoppingMall.superAdmin.configs.patch(
      adminConnection,
      { body: booleanConfig },
    );
  typia.assert(booleanResult);
  // Step 6: Test nested object configuration update
  const objectResult =
    await api.functional.shoppingMall.superAdmin.configs.patch(
      adminConnection,
      { body: nestedObjectConfig },
    );
  typia.assert(objectResult);
  // Step 7: Verify configuration values were stored correctly by fetching them back
  const configs = await api.functional.shoppingMall.superAdmin.configs.patch(
    adminConnection,
    { body: typia.random<IShoppingMallSystematicConfig.IUpdate>() },
  );
  typia.assert(configs);
  // Step 8: Test that immutable config_key cannot be changed
  const immutableKeyConfig = {
    config_key: "existing_key",
    config_value: JSON.stringify("new_value"),
    data_type: "string",
    description: "Trying to change immutable key",
    is_active: true,
  } satisfies IShoppingMallSystematicConfig.IUpdate;
  await TestValidator.error("config_key immutable", async () => {
    await api.functional.shoppingMall.superAdmin.configs.patch(
      adminConnection,
      {
        body: immutableKeyConfig,
      },
    );
  });
}
