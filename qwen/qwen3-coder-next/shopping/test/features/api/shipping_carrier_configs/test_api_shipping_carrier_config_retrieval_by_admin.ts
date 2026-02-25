import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShippingCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrier";
import type { IShoppingMallShippingCarrierConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrierConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_carriers_create } from "../../../generate/generate_random_shopping_mall_admin_carriers_create";
import { prepare_random_shopping_mall_shipping_carrier } from "../../../prepare/prepare_random_shopping_mall_shipping_carrier";

export async function test_api_shipping_carrier_config_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Step 2: Create a new shipping carrier
  const carrierCode = typia.random<string & tags.Pattern<"^[a-zA-Z0-9_]+$">>();
  const carrierName = RandomGenerator.name();
  const apiEndpoint = `https://${RandomGenerator.alphaNumeric(8)}.example.com/api/v1`;
  const carrier = await api.functional.shoppingMall.admin.carriers.create(
    adminConnection,
    {
      body: {
        code: carrierCode,
        name: carrierName,
        api_endpoint: apiEndpoint,
        api_key: RandomGenerator.alphaNumeric(32),
        api_secret: RandomGenerator.alphaNumeric(32),
        is_enabled: true,
      } satisfies IShoppingMallShippingCarrier.ICreate,
    },
  );
  typia.assert(carrier);
  // Step 3: Update carrier configuration with multiple key-value pairs
  const configs = {
    weight_unit: "kg",
    dimension_unit: "cm",
    api_timeout: "30",
  };
  await api.functional.shoppingMall.admin.carriers.configs.updateConfigs(
    adminConnection,
    {
      carrierId: carrier.id,
      body: configs,
    },
  );
  // Step 4: Retrieve a specific configuration parameter
  const configKey = "weight_unit" as const;
  const retrieved =
    await api.functional.shoppingMall.admin.carriers.configs.getByCarrieridAndConfigkey(
      adminConnection,
      {
        carrierId: carrier.id,
        configKey,
      },
    );
  typia.assert(retrieved);
  // Step 5: Validate retrieved configuration matches expected value
  TestValidator.equals("config value matches", retrieved.value, "kg");
  TestValidator.equals("config key matches", retrieved.key, "weight_unit");
  TestValidator.equals(
    "carrier relationship exists",
    retrieved.carrier.id,
    carrier.id,
  );
  TestValidator.equals(
    "carrier code matches",
    retrieved.carrier.code,
    carrierCode,
  );
  TestValidator.equals(
    "carrier name matches",
    retrieved.carrier.name,
    carrierName,
  );
  TestValidator.predicate("carrier is enabled", retrieved.carrier.is_enabled);
  TestValidator.predicate(
    "created_at is valid date-time",
    retrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrieved.updated_at !== undefined,
  );
}
