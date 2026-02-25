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

export async function test_api_shipping_carrier_config_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as any,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 2. Create a shipping carrier with at least one config parameter
  const carrier = await api.functional.shoppingMall.admin.carriers.create(
    adminConnection,
    {
      body: {
        code: `carrier_${RandomGenerator.alphabets(6)}`,
        name: `Carrier ${RandomGenerator.name()}`,
        api_endpoint: `https://api.carrier${RandomGenerator.alphabets(4)}.com/v1`,
        api_key: `key_${RandomGenerator.alphaNumeric(32)}`,
        api_secret: `secret_${RandomGenerator.alphaNumeric(32)}`,
        account_number: null,
        is_enabled: true,
      } satisfies IShoppingMallShippingCarrier.ICreate,
    },
  );
  typia.assert(carrier);
  // 3. Add at least one config parameter to the carrier
  await api.functional.shoppingMall.admin.carriers.configs.updateConfigs(
    adminConnection,
    {
      carrierId: carrier.id,
      body: {
        weight_unit: "kg",
        dimension_unit: "cm",
      },
    },
  );
  // 4. Attempt to retrieve a non-existent configuration key
  const nonExistentKey = `non_existent_config_${RandomGenerator.alphabets(8)}`;
  await TestValidator.error(
    "404 error when config key does not exist",
    async () => {
      await api.functional.shoppingMall.admin.carriers.configs.getByCarrieridAndConfigkey(
        adminConnection,
        {
          carrierId: carrier.id,
          configKey: nonExistentKey,
        },
      );
    },
  );
}
