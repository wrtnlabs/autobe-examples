import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
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
import { generate_random_shopping_mall_admin_sellers_suspensions_create } from "../../../generate/generate_random_shopping_mall_admin_sellers_suspensions_create";
import { prepare_random_shopping_mall_seller_suspension } from "../../../prepare/prepare_random_shopping_mall_seller_suspension";

export async function test_api_seller_suspension_full_configuration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin123!@#$",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin123!@#$",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // Step 2: Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "Seller123!@#$",
      shop_name: "Test Seller Shop",
      shop_description: "A test seller shop for suspension testing",
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // Step 3: Admin creates seller suspension with full configuration
  const suspension =
    await api.functional.shoppingMall.admin.sellers.suspensions.create(
      adminConnection,
      {
        sellerId: sellerJoin.data.profile.id,
        body: {
          reason: "Testing full suspension configuration",
          admin_id: null,
          started_at: new Date().toISOString(),
          duration_days: 7,
          appeal_allowed: false,
          full_block: true,
          hide_products: true,
          block_orders: true,
          block_login: true,
          ended_at: null,
        } satisfies IShoppingMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  // Step 4: Verify suspension configuration matches input
  TestValidator.equals(
    "reason matches",
    suspension.reason,
    "Testing full suspension configuration",
  );
  TestValidator.equals("full_block is true", suspension.fullBlock, true);
  TestValidator.equals("hide_products is true", suspension.hideProducts, true);
  TestValidator.equals("block_orders is true", suspension.blockOrders, true);
  TestValidator.equals("block_login is true", suspension.blockLogin, true);
  TestValidator.equals("duration_days is 7", suspension.durationDays, 7);
  TestValidator.equals(
    "appeal_allowed is false",
    suspension.appealAllowed,
    false,
  );
}
