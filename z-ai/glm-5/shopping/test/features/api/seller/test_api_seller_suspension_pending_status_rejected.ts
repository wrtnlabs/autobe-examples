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
 * Test the business rule that prevents suspending a seller with 'pending' approval status.
 *
 * According to the specification, administrators must approve or reject pending sellers
 * before any suspension action can be taken. This test validates that attempting to suspend
 * a pending seller results in an error.
 *
 * Steps:
 * 1. Admin joins and receives authentication tokens
 * 2. A seller registers (status is 'pending')
 * 3. Admin attempts to suspend the pending seller
 * 4. Verify the operation fails with appropriate error
 */
export async function test_api_seller_suspension_pending_status_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Create a seller account (will have 'pending' approval status by default)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Verify the seller has 'pending' status
  TestValidator.equals(
    "seller approval status is pending",
    sellerAuth.approvalStatus,
    "pending",
  );
  // Step 3: Admin attempts to suspend the pending seller - this should fail
  await TestValidator.error("cannot suspend pending seller", async () => {
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId: sellerAuth.id,
    });
  });
}
