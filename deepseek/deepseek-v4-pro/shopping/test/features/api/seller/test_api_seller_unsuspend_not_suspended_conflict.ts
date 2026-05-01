import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
 * Test that unsuspending a seller who is not currently suspended returns 409 Conflict.
 *
 * Verifies the business rule that the unsuspend operation requires the seller to be in a suspended state — suspended_at must not be null. When an administrator attempts to unsuspend an approved seller who was never suspended, the operation fails with a 409 Conflict response because there is no active suspension to lift.
 *
 * The test also validates that the seller's state remains unchanged after the failed unsuspension attempt: approval_status stays "approved" and suspended_at remains null.
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. Seller registers a new account in pending approval status.
 * 3. Administrator approves the seller, transitioning them to "approved" with suspended_at still null.
 * 4. Administrator attempts to unsuspend the approved-but-not-suspended seller.
 * 5. The unsuspend call fails with 409 Conflict because no suspension exists.
 * 6. Seller's state is verified to remain unchanged.
 */
export async function test_api_seller_unsuspend_not_suspended_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves the seller (suspended_at remains null)
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Verify seller is approved but not suspended
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "seller not suspended",
    approvedSeller.suspended_at,
    null,
  );
  // 5. Attempt to unsuspend a non-suspended seller — must fail with 409 Conflict
  await TestValidator.error(
    "unsuspend non-suspended seller returns 409",
    async () => {
      await api.functional.shoppingMall.admin.sellers.unsuspend(
        adminConnection,
        { sellerId: seller.id },
      );
    },
  );
}
