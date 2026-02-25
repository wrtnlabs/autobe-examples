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

/**
 * Test the complete seller approval lifecycle: registration → rejection → reapply.
 *
 * Scenario:
 * 1) Admin registers and gets authenticated
 * 2) Seller registers with pending status
 * 3) Admin rejects the seller registration
 * 4) Seller reapplies with updated shop information
 *
 * Validates the full state transitions:
 * - pending → rejected (after admin rejection)
 * - rejected → pending (after seller reapply)
 *
 * This test validates the retry mechanism for sellers who were initially rejected.
 */
export async function test_api_seller_approval_lifecycle_rejection_to_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account for approval/rejection operations
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Seller registration - creates account with pending approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // Validate initial approval status is "pending"
  TestValidator.equals(
    "initial approval status is pending",
    sellerAuth.approvalStatus,
    "pending",
  );
  // Store seller ID for rejection
  const sellerId = sellerAuth.id;
  // 3. Admin rejects the seller registration
  const rejectionReason =
    "Incomplete business documentation. Please provide valid business registration certificate.";
  const rejectedSeller = await api.functional.shoppingMall.admin.sellers.reject(
    adminConnection,
    {
      sellerId,
      body: { reason: rejectionReason } satisfies IShoppingMallSeller.IReject,
    },
  );
  typia.assert(rejectedSeller);
  // Validate rejection status and reason
  TestValidator.equals(
    "status after rejection",
    rejectedSeller.approvalStatus,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason stored",
    rejectedSeller.rejectionReason,
    rejectionReason,
  );
  // 4. Seller reapplies with updated information after rejection
  const updatedShopName = RandomGenerator.name();
  const updatedShopDescription = RandomGenerator.paragraph({ sentences: 3 });
  const reappliedSeller = await api.functional.shoppingMall.seller.reapply(
    sellerConnection,
    {
      body: {
        shopName: updatedShopName,
        shopDescription: updatedShopDescription,
      } satisfies IShoppingMallSeller.IReapply,
    },
  );
  typia.assert(reappliedSeller);
  // Validate status is back to "pending" after reapply
  TestValidator.equals(
    "status after reapply is pending",
    reappliedSeller.approvalStatus,
    "pending",
  );
  TestValidator.equals(
    "rejection reason cleared after reapply",
    reappliedSeller.rejectionReason,
    null,
  );
  TestValidator.equals(
    "shop name updated",
    reappliedSeller.shopName,
    updatedShopName,
  );
  TestValidator.equals(
    "shop description updated",
    reappliedSeller.shopDescription,
    updatedShopDescription,
  );
}
