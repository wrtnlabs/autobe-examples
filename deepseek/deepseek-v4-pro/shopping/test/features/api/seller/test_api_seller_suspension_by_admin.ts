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
 * Test administrator suspension of an approved seller account.
 *
 * Validates the complete seller suspension workflow: administrator registration and authentication, seller registration in pending state, administrator approval transitioning the seller to approved status, and finally administrator suspension. The test confirms that suspension sets a non-null suspended_at timestamp without altering the approval_status, preserving the separation between enforcement actions and the approval lifecycle.
 *
 * 1. Administrator registers and authenticates via admin join, obtaining admin privileges.
 * 2. Seller registers with randomized credentials, starting in pending approval status.
 * 3. Administrator approves the seller's registration, transitioning to approved state — a required pre-condition for suspension.
 * 4. Administrator suspends the approved seller.
 * 5. Validates that suspended_at is set to a valid date-time, approval_status remains "approved", and the seller ID matches the original.
 */
export async function test_api_seller_suspension_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Admin suspends seller
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(suspendedSeller);
  // 5. Validate suspension
  TestValidator.equals("seller id unchanged", suspendedSeller.id, seller.id);
  TestValidator.equals(
    "approval status remains approved",
    suspendedSeller.approval_status,
    "approved",
  );
  TestValidator.predicate(
    "suspended_at is set",
    suspendedSeller.suspended_at !== null,
  );
}
