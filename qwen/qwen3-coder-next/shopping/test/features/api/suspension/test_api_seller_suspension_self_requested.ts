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

export async function test_api_seller_suspension_self_requested(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin user for approval workflow
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url:
        Math.random() > 0.5
          ? typia.random<string & tags.Format<"uri">>()
          : null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResponse);
  // 3. Login as seller to get authentication
  const sellerLoginResponse =
    await api.functional.shoppingMall.auth.seller.login(sellerConnection, {
      body: {
        email: sellerEmail,
        password: "test1234",
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(sellerLoginResponse);
  // Create new connection with seller authentication
  const sellerAuthenticatedConnection: api.IConnection = {
    host: connection.host,
  };
  sellerAuthenticatedConnection.headers = {
    Authorization: sellerLoginResponse.token.access,
  };
  // 4. Seller requests own account suspension (seller-initiated with admin_id=null)
  const suspensionBody: IShoppingMallSellerSuspension.ICreate = {
    reason: "Seller requesting own account suspension for planned closure",
    admin_id: null, // This indicates seller-initiated, not admin-initiated
    started_at: new Date().toISOString(),
    duration_days: null, // Indefinite suspension
    appeal_allowed: true,
    full_block: false,
    hide_products: true,
    block_orders: true,
    block_login: true,
    ended_at: null,
  };
  const createdSuspension =
    await api.functional.shoppingMall.admin.sellers.suspensions.create(
      sellerAuthenticatedConnection,
      {
        sellerId: sellerJoinResponse.data.profile.id,
        body: suspensionBody,
      },
    );
  typia.assert(createdSuspension);
  // 5. Validate the created suspension for seller-initiated scenario
  TestValidator.equals(
    "seller matches",
    createdSuspension.seller.id,
    sellerJoinResponse.data.profile.id,
  );
  TestValidator.equals(
    "reason matches",
    createdSuspension.reason,
    suspensionBody.reason,
  );
  TestValidator.equals(
    "status is pending for seller-initiated",
    createdSuspension.status,
    "pending",
  );
  TestValidator.equals(
    "admin_id is null for seller-initiated",
    createdSuspension.admin,
    null,
  );
  TestValidator.equals(
    "approvingAdmin should be set (admin who will approve)",
    createdSuspension.approvingAdmin !== null,
    true,
  );
  TestValidator.equals(
    "appeal_allowed is set correctly",
    createdSuspension.appealAllowed,
    suspensionBody.appeal_allowed,
  );
  TestValidator.equals(
    "full_block is set correctly",
    createdSuspension.fullBlock,
    suspensionBody.full_block,
  );
  TestValidator.equals(
    "hide_products is set correctly",
    createdSuspension.hideProducts,
    suspensionBody.hide_products,
  );
  TestValidator.equals(
    "block_orders is set correctly",
    createdSuspension.blockOrders,
    suspensionBody.block_orders,
  );
  TestValidator.equals(
    "block_login is set correctly",
    createdSuspension.blockLogin,
    suspensionBody.block_login,
  );
  TestValidator.predicate(
    "has valid startedAt timestamp",
    new Date(createdSuspension.startedAt).getTime() > 0,
  );
  TestValidator.equals(
    "endedAt is null for indefinite",
    createdSuspension.endedAt,
    null,
  );
  TestValidator.equals(
    "approvedAt is null for pending status",
    createdSuspension.approvedAt,
    null,
  );
  TestValidator.equals("revokedAt is null", createdSuspension.revokedAt, null);
  TestValidator.equals(
    "rejectedAt is null",
    createdSuspension.rejectedAt,
    null,
  );
  TestValidator.equals(
    "duration_days is null for indefinite",
    createdSuspension.durationDays,
    null,
  );
  TestValidator.equals(
    "initiatingIp is null for self-requested",
    createdSuspension.initiatingIp,
    null,
  );
  // 6. Verify created_at and updated_at timestamps are properly set
  TestValidator.predicate(
    "has valid createdAt timestamp",
    new Date(createdSuspension.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "has valid updatedAt timestamp",
    new Date(createdSuspension.updatedAt).getTime() > 0,
  );
}
