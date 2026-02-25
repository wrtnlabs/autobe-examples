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

export async function test_api_seller_suspension_immediate_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account with approval permissions
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // 2. Create seller account to be suspended
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  await authorize_seller_join(sellerConnection, { body: sellerCredentials });
  // 3. Login as seller to get seller profile
  const sellerAuthorized = await authorize_seller_login(sellerConnection, {
    body: sellerCredentials,
  });
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // 4. Get admin ID from admin profile
  const adminProfile =
    await api.functional.shoppingMall.admin.administrators.at(adminConnection, {
      administratorId: sellerAuthorized.id,
    });
  typia.assert(adminProfile);
  const adminId = adminProfile.id;
  // 5. Create seller suspension with immediate approval
  const suspensionReason = RandomGenerator.paragraph({ sentences: 2 });
  const suspension =
    await api.functional.shoppingMall.admin.sellers.suspensions.create(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          reason: suspensionReason,
          admin_id: adminId, // Immediate approval by providing admin_id
          started_at: new Date().toISOString(),
          duration_days: 30,
          appeal_allowed: true,
          full_block: false,
          hide_products: true,
          block_orders: true,
          block_login: true,
          ended_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(suspension);
  // 6. Validate suspension properties
  TestValidator.equals(
    "suspension reason matches",
    suspension.reason,
    suspensionReason,
  );
  TestValidator.equals("seller matches", suspension.seller.id, sellerId);
  TestValidator.equals("status is approved", suspension.status, "approved");
  TestValidator.notEquals(
    "approvingAdmin is set",
    suspension.approvingAdmin.id,
    null,
  );
  TestValidator.notEquals("approvedAt is set", suspension.approvedAt, null);
  TestValidator.predicate(
    "startedAt is valid",
    new Date(suspension.startedAt) instanceof Date,
  );
  TestValidator.predicate(
    "endedAt is valid",
    new Date(suspension.endedAt ?? new Date().toISOString()) instanceof Date,
  );
  TestValidator.equals("durationDays matches", suspension.durationDays, 30);
  TestValidator.equals("appealAllowed matches", suspension.appealAllowed, true);
  TestValidator.equals("fullBlock matches", suspension.fullBlock, false);
  TestValidator.equals("hideProducts matches", suspension.hideProducts, true);
  TestValidator.equals("blockOrders matches", suspension.blockOrders, true);
  TestValidator.equals("blockLogin matches", suspension.blockLogin, true);
}