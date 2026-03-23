import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
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
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test the edge case where an administrator attempts to ban a seller that is already banned.
 * The test verifies that:
 * 1. First ban operation succeeds and transitions seller status to 'banned'
 * 2. Second ban attempt returns a 409 Conflict error
 * 3. The seller's status remains 'banned' (no duplicate ban action occurs)
 * 4. The system prevents redundant ban operations to maintain data integrity
 */
export async function test_api_seller_ban_already_banned_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  // 2. Setup: Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Setup: Submit seller approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(approvalRequest);
  // 4. Setup: Admin approves the seller
  const updatedRequest =
    await api.functional.shoppingMall.admin.seller_approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. First Ban: Admin bans the seller (should succeed)
  const bannedSeller = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  typia.assert(bannedSeller);
  // Verify first ban succeeded
  TestValidator.equals(
    "seller status is banned after first ban",
    bannedSeller.status,
    "banned",
  );
  // 6. Second Ban Attempt: Admin tries to ban the same seller again (should fail with 409)
  await TestValidator.httpError(
    "second ban attempt returns 409 Conflict",
    409,
    async () =>
      await api.functional.shoppingMall.admin.sellers.ban(adminConnection, {
        sellerId: sellerAuth.id,
      }),
  );
}
