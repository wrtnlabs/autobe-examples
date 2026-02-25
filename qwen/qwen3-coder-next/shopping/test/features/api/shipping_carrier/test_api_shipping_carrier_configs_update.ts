import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShippingCarrierConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrierConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_shipping_carrier_configs_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12341234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminUser);
  // 2. Login as admin to establish authenticated session
  const loginAdminConnection: api.IConnection = {
    host: connection.host,
  };
  const emailForLogin: string & tags.Format<"email"> & tags.MaxLength<255> = adminUser.email satisfies string as string & tags.Format<"email"> & tags.MaxLength<255>;
  await authorize_admin_login(loginAdminConnection, {
    body: {
      email: emailForLogin,
      password: "12341234",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(loginAdminConnection);
  // 3. Generate a random shipping carrier ID for testing
  const carrierId = typia.random<string & tags.Format<"uuid">>();
  // 4. Update carrier configuration with key-value pairs
  const configUpdates: IShoppingMallShippingCarrierConfig.IRequest = {
    weight_unit: "kg",
    dimension_unit: "cm",
    max_weight: "50",
    insurance_enabled: "true",
  };
  const updatedConfig =
    await api.functional.shoppingMall.admin.carriers.configs.updateConfigs(
      loginAdminConnection,
      {
        carrierId: carrierId,
        body: configUpdates,
      },
    );
  typia.assert(updatedConfig);
  // 5. Validate the updated configuration
  TestValidator.equals(
    "weight_unit is updated",
    updatedConfig.weight_unit,
    "kg",
  );
  TestValidator.equals(
    "dimension_unit is updated",
    updatedConfig.dimension_unit,
    "cm",
  );
  TestValidator.equals("max_weight is updated", updatedConfig.max_weight, "50");
  TestValidator.equals(
    "insurance_enabled is updated",
    updatedConfig.insurance_enabled,
    "true",
  );
}