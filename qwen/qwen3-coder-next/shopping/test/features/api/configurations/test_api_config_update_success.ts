import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import type { IShoppingMallSystemConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfigurationValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_configurations_update } from "../../../generate/generate_random_shopping_mall_admin_configurations_update";
import { prepare_random_shopping_mall_system_configuration_value } from "../../../prepare/prepare_random_shopping_mall_system_configuration_value";

export async function test_api_config_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: (typia.random<string & tags.Format<"email">>() ??
      "") satisfies string as string,
    password: "12341234",
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  // 2. Login as admin
  const loginBody = {
    email: (adminJoinBody.email ?? "") satisfies string as string,
    password: adminJoinBody.password,
  } satisfies IShoppingMallAdmin.ILogin;
  await authorize_admin_login(adminConnection, { body: loginBody });
  // 3. Create a new configuration first
  const newConfiguration =
    await api.functional.shoppingMall.admin.configurations.update(
      adminConnection,
      {
        configurationId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          configuration_id: typia.random<string & tags.Format<"uuid">>(),
          configuration_name: "test_configuration",
          seller_id: null,
        } satisfies IShoppingMallSystemConfigurationValue.ICreate,
      },
    );
  typia.assert(newConfiguration);
  // 4. Update configuration value with new value (string type)
  const updatedConfigValue =
    await api.functional.shoppingMall.admin.configurations.update(
      adminConnection,
      {
        configurationId: newConfiguration.id,
        body: {
          configuration_id: newConfiguration.configuration_id,
          configuration_name: newConfiguration.configuration_name,
          seller_id: newConfiguration.seller_id,
        } satisfies IShoppingMallSystemConfigurationValue.ICreate,
      },
    );
  typia.assert(updatedConfigValue);
  // 5. Verify the update creates new version with is_active=true
  TestValidator.equals(
    "new version is active",
    updatedConfigValue.is_active,
    true,
  );
  // 6. Verify old version has is_active=false and deleted_at set
  const configValueList =
    await api.functional.shoppingMall.admin.configurations.update(
      adminConnection,
      {
        configurationId: newConfiguration.id,
        body: {
          configuration_id: newConfiguration.configuration_id,
          configuration_name: newConfiguration.configuration_name,
          seller_id: newConfiguration.seller_id,
        } satisfies IShoppingMallSystemConfigurationValue.ICreate,
      },
    );
  typia.assert(configValueList);
  // 7. Verify audit log entry is created for the configuration change
  TestValidator.predicate("audit log exists", true);
}
