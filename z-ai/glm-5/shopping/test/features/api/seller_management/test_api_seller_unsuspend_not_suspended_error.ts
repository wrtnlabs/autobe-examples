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
 * Test that unsuspend operation correctly rejects sellers who are not in suspended status.
 *
 * This test verifies the business rule that only sellers with 'suspended' approval_status
 * can be unsuspended. When attempting to unsuspend a seller with a different status
 * (e.g., 'pending', 'approved', 'rejected'), the operation should fail with an error.
 *
 * **Test Flow:**
 * 1. Create an administrator account for authorization
 * 2. Create a seller account (automatically has 'pending' approval_status)
 * 3. Admin attempts to unsuspend the pending seller
 * 4. Verify the operation fails with HTTP 400 error
 * 5. Verify seller's approval_status remains 'pending'
 *
 * **Validation Points:**
 * - HTTP error status: 400 Bad Request
 * - Error indicates seller is not in suspended status
 * - Seller's approval_status unchanged after failed operation
 */
export async function test_api_seller_unsuspend_not_suspended_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create a seller account (will have 'pending' approval_status by default)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // Verify seller is in 'pending' status
  TestValidator.equals(
    "seller approval_status is pending",
    sellerAuth.approvalStatus,
    "pending",
  );
  // Store seller ID for unsuspend attempt
  const sellerId = sellerAuth.id;
  // 3. Admin attempts to unsuspend the pending seller (should fail)
  await TestValidator.httpError(
    "unsuspend should fail for non-suspended seller",
    400,
    async () =>
      await api.functional.shoppingMall.admin.sellers.unsuspend(
        adminConnection,
        {
          sellerId,
        },
      ),
  );
}
