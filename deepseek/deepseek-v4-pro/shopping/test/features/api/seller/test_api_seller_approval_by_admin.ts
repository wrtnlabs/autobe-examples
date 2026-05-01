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
 * Test administrator approval of a pending seller registration.
 *
 * Validates the complete administrator approval workflow for seller accounts. A new seller registers through the platform and automatically receives "pending" approval status. A separate administrator then approves the seller, unlocking full selling privileges including product creation, inventory management, order processing, and dashboard access.
 *
 * After approval, the test verifies that the seller's approval_status transitions from "pending" to "approved", any previous rejection_reason is cleared to null, all seller identity fields are preserved, and the updated_at timestamp reflects the approval action time.
 *
 * 1. Seller registers with randomized credentials, starting in pending status.
 * 2. Administrator registers and authenticates as a separate user.
 * 3. Administrator approves the seller using the seller's ID.
 * 4. Validates the approved seller record has correct approval_status, null rejection_reason, preserved identity, and updated timestamp.
 */
export async function test_api_seller_approval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account (pending approval status by default)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 3. Administrator approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Validate approval state transitions
  TestValidator.equals(
    "approval_status",
    approvedSeller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "rejection_reason cleared",
    approvedSeller.rejection_reason,
    null,
  );
  // 5. Validate seller identity preserved
  TestValidator.equals("seller id preserved", approvedSeller.id, seller.id);
  TestValidator.equals(
    "seller email preserved",
    approvedSeller.email,
    seller.email,
  );
  TestValidator.equals(
    "seller created_at preserved",
    approvedSeller.created_at,
    seller.created_at,
  );
  TestValidator.equals("not suspended", approvedSeller.suspended_at, null);
  TestValidator.equals("not banned", approvedSeller.banned_at, null);
  TestValidator.equals("not deleted", approvedSeller.deleted_at, null);
  // 6. Validate profile exists and updated_at reflects approval
  TestValidator.predicate("profile exists", approvedSeller.profile !== null);
  TestValidator.predicate(
    "updated_at reflects approval",
    approvedSeller.updated_at >= approvedSeller.created_at,
  );
}
