import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShippingCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrier";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_carriers_create } from "../../../generate/generate_random_shopping_mall_admin_carriers_create";
import { prepare_random_shopping_mall_shipping_carrier } from "../../../prepare/prepare_random_shopping_mall_shipping_carrier";

export async function test_api_shipping_carrier_deletion_blocked_by_seller_config(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin login to create carrier
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: (typia.random<string>() as string) satisfies string & tags.MaxLength<255> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Create a new shipping carrier
  const carrier = await api.functional.shoppingMall.admin.carriers.create(
    adminConnection,
    {
      body: {
        code: RandomGenerator.alphabets(6).toLowerCase(),
        name: RandomGenerator.name(),
        api_endpoint: RandomGenerator.pick([
          "https://api.fedex.com/ws",
          "https://api.ups.com/xml",
          "https://api.dhl.com/endpoint",
        ]),
        api_key: RandomGenerator.alphaNumeric(32),
        api_secret: RandomGenerator.alphaNumeric(32),
        is_enabled: true,
      } satisfies IShoppingMallShippingCarrier.ICreate,
    },
  );
  typia.assert(carrier);
  // 3. Seller login to configure the carrier
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: (typia.random<string>() as string) satisfies string & tags.MaxLength<255> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 4. Attempt to delete the carrier as admin
  // This should fail because the carrier is referenced by seller configuration
  await TestValidator.error(
    "carrier deletion blocked by seller configuration",
    async () => {
      await api.functional.shoppingMall.admin.carriers.erase(adminConnection, {
        carrierId: carrier.id,
      });
    },
  );
}