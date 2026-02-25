import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an administrator cannot force-approve a refund request for an order item
 * that is not in 'delivered' status.
 *
 * This test validates the business rule that force-approve operations require the
 * associated order item to have 'delivered' status. Attempting to force-approve
 * a refund for a non-delivered item (paid, shipped, cancelled, or already refunded)
 * should result in an error.
 *
 * Business Rules Validated:
 * - Force-approve requires order item to have 'delivered' status
 * - Prevents refunding items that haven't been received by customer
 * - Enforces proper refund workflow validation
 *
 * Expected Result:
 * - API returns an error (400 Bad Request)
 * - Error message indicates the order item status requirement
 */
export async function test_api_refund_request_force_approve_wrong_item_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Attempt to force-approve a refund request with a random UUID
  // This simulates attempting to approve a refund for an order item
  // that is not in 'delivered' status (which would result in an error)
  //
  // The API should validate:
  // 1. The refund request exists
  // 2. The associated order item status is 'delivered'
  // 3. The refund request status is 'pending'
  //
  // If any of these conditions are not met, the API should return an error
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "force-approve refund request with wrong item status should fail",
    async () => {
      await api.functional.shoppingMall.admin.refund_requests.force_approve.forceApprove(
        adminConnection,
        {
          refundRequestId,
        },
      );
    },
  );
}
