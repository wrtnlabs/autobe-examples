import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingCarrierConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingCarrierConfig";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_carriers_create } from "../../../generate/generate_random_shopping_mall_admin_carriers_create";
import { prepare_random_shopping_mall_shipping_carrier } from "../../../prepare/prepare_random_shopping_mall_shipping_carrier";

export async function test_api_carrier_config_role_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin and carrier
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies IShoppingMallAdmin.IJoin;
  const superAdminAuthorized = await authorize_admin_join(
    superAdminConnection,
    { body: superAdminCredentials },
  );
  typia.assert(superAdminAuthorized);
  const carrierData = {
    code: RandomGenerator.alphabets(6),
    name: RandomGenerator.name(),
    api_endpoint: typia.random<string & tags.Format<"uri">>(),
    api_key: RandomGenerator.alphaNumeric(32),
    api_secret: RandomGenerator.alphaNumeric(32),
    is_enabled: true,
  } satisfies IShoppingMallShippingCarrier.ICreate;
  const carrier = await api.functional.shoppingMall.admin.carriers.create(
    superAdminConnection,
    {
      body: carrierData,
    },
  );
  typia.assert(carrier);
  // 2. Regular admin can retrieve carrier configuration
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies IShoppingMallAdmin.IJoin;
  const regularAdminAuthorized = await authorize_admin_join(
    regularAdminConnection,
    { body: regularAdminCredentials },
  );
  typia.assert(regularAdminAuthorized);
  const regularAdminConfigResponse =
    await api.functional.shoppingMall.admin.carriers.configs.getByCarrierid(
      regularAdminConnection,
      {
        carrierId: carrier.id,
      },
    );
  typia.assert(regularAdminConfigResponse);
  TestValidator.predicate(
    "regular admin can retrieve config",
    regularAdminConfigResponse.data !== undefined &&
      regularAdminConfigResponse.data.length >= 0,
  );
  // 3. Seller cannot retrieve carrier configuration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  await authorize_seller_join(sellerConnection, { body: sellerCredentials });
  const sellerCredentialsLogin = {
    email: sellerCredentials.email,
    password: sellerCredentials.password,
  } satisfies IShoppingMallSeller.ILogin;
  const sellerAuthorized = await authorize_seller_login(sellerConnection, {
    body: sellerCredentialsLogin,
  });
  typia.assert(sellerAuthorized);
  await TestValidator.error(
    "seller cannot retrieve carrier config",
    async () => {
      await api.functional.shoppingMall.admin.carriers.configs.getByCarrierid(
        sellerConnection,
        {
          carrierId: carrier.id,
        },
      );
    },
  );
}
