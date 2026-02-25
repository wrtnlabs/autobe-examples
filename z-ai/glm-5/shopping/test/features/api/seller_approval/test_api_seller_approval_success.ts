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
 * Test the primary success path for seller approval workflow.
 *
 * This test validates that an administrator can successfully approve
 * a pending seller registration, enabling the seller to operate on the platform.
 *
 * Steps:
 * 1. Create an administrator account with approval authority
 * 2. Create a new seller account with 'pending' approval status
 * 3. Admin approves the pending seller
 * 4. Verify the seller's approval_status is changed to 'approved'
 * 5. Verify the seller's profile data (email, shopName) is preserved
 */
export async function test_api_seller_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for approval authority
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create seller account with pending status
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: shopName,
    },
  });
  typia.assert(sellerAuth);
  // Verify seller has pending status
  TestValidator.equals(
    "seller initial approval status",
    sellerAuth.approvalStatus,
    "pending",
  );
  const sellerId = sellerAuth.id;
  // 3. Admin approves the pending seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId,
    });
  typia.assert(approvedSeller);
  // 4. Verify the seller's approval_status is changed to 'approved'
  TestValidator.equals(
    "seller approval status after approval",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 5. Verify the seller's profile data is preserved
  TestValidator.equals(
    "seller email preserved",
    approvedSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "seller shop name preserved",
    approvedSeller.shopName,
    shopName,
  );
  // 6. Verify the seller ID matches
  TestValidator.equals("seller ID matches", approvedSeller.id, sellerId);
  // 7. Verify updated_at timestamp is set (should be a valid date-time)
  TestValidator.predicate(
    "updated_at is valid date-time",
    new Date(approvedSeller.updatedAt).getTime() > 0,
  );
}
