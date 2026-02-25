import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_seller_rejection_reapply_cycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create first seller account (will be rejected and then reapply)
  const sellerEmail1 = typia.random<string & tags.Format<"email">>();
  const sellerPassword1 = RandomGenerator.alphaNumeric(16);
  const sellerConnection1: api.IConnection = { host: connection.host };
  const sellerAuth1 = await authorize_seller_join(sellerConnection1, {
    body: {
      email: sellerEmail1,
      password: sellerPassword1,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(sellerAuth1);
  const sellerId1 = sellerAuth1.id;
  // 3. Verify seller is in pending status initially
  TestValidator.equals(
    "initial approval status",
    sellerAuth1.approvalStatus,
    "pending",
  );
  // 4. Admin rejects the seller with a reason
  const rejectionReason =
    "Shop documentation incomplete. Please provide valid business registration.";
  const rejectedSeller = await api.functional.shoppingMall.admin.sellers.reject(
    adminConnection,
    {
      sellerId: sellerId1,
      body: { reason: rejectionReason } satisfies IShoppingMallSeller.IReject,
    },
  );
  typia.assert(rejectedSeller);
  // 5. Verify rejection status and reason
  TestValidator.equals(
    "approval status after rejection",
    rejectedSeller.approvalStatus,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason stored",
    rejectedSeller.rejectionReason,
    rejectionReason,
  );
  // 6. Create second seller account (for comparison/validation)
  const sellerEmail2 = typia.random<string & tags.Format<"email">>();
  const sellerPassword2 = RandomGenerator.alphaNumeric(16);
  const sellerConnection2: api.IConnection = { host: connection.host };
  const sellerAuth2 = await authorize_seller_join(sellerConnection2, {
    body: {
      email: sellerEmail2,
      password: sellerPassword2,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(sellerAuth2);
  const sellerId2 = sellerAuth2.id;
  // 7. Verify second seller is in pending status
  TestValidator.equals(
    "second seller initial status",
    sellerAuth2.approvalStatus,
    "pending",
  );
  // 8. Verify rejection-reapply cycle can be repeated
  // Admin can reject the second seller as well
  const rejectedSeller2 =
    await api.functional.shoppingMall.admin.sellers.reject(adminConnection, {
      sellerId: sellerId2,
      body: {
        reason: "Another rejection for testing cycle.",
      } satisfies IShoppingMallSeller.IReject,
    });
  typia.assert(rejectedSeller2);
  TestValidator.equals(
    "second seller rejected",
    rejectedSeller2.approvalStatus,
    "rejected",
  );
  // Note: The reapply API endpoint is not available in the provided API functions.
  // When the reapply endpoint becomes available, the following steps would be tested:
  // - Seller calls POST /shoppingMall/seller/reapply
  // - Verify seller status changes back to 'pending'
  // - Verify rejection_reason is cleared (null)
  // - Verify admin can approve or reject the reapplied seller
}
