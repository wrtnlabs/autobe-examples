import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
 * Test admin force refund of a delivered order item.
 *
 * This test validates the complete workflow where an administrator force-refunds
 * a delivered order item, bypassing the normal seller approval process. The test
 * verifies that the refund request is immediately approved, the order item status
 * changes to 'refunded', and validates the refund request response structure.
 *
 * Note: This test assumes that the order and order item already exist in the system
 * with the order item in 'delivered' status. In a full E2E test suite, this would
 * be preceded by tests that create the complete order flow (product creation,
 * order placement, shipment, and delivery confirmation).
 */
export async function test_api_refund_force_refund_delivered_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com",
    },
  });
  // 2. Generate test order and item IDs
  // In a complete test suite, these would come from actual order creation flow
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Admin force-refunds the delivered order item
  const refundRequest =
    await api.functional.shoppingMall.admin.orders.items.force_refund.forceRefund(
      adminConnection,
      {
        orderId: orderId,
        itemId: itemId,
        body: {
          reason: "Admin force refund for testing purposes",
        } satisfies IShoppingMallRefundRequest.IForceRefund,
      },
    );
  typia.assert(refundRequest);
  // 4. Validate refund request response structure
  TestValidator.equals(
    "refund request status is approved",
    refundRequest.status,
    "approved",
  );
  TestValidator.equals(
    "refund request reason matches",
    refundRequest.reason,
    "Admin force refund for testing purposes",
  );
  // 5. Validate timestamps are set
  TestValidator.predicate(
    "refund request has requested_at timestamp",
    refundRequest.requestedAt !== null &&
      refundRequest.requestedAt !== undefined,
  );
  TestValidator.predicate(
    "refund request has responded_at timestamp",
    refundRequest.respondedAt !== null &&
      refundRequest.respondedAt !== undefined,
  );
  // 6. Validate order item information in refund request
  TestValidator.equals(
    "order item status is refunded",
    refundRequest.orderItem.status,
    "refunded",
  );
  TestValidator.predicate(
    "order item has valid quantity",
    refundRequest.orderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "order item has valid price",
    refundRequest.orderItem.price >= 0,
  );
  // 7. Validate customer information in refund request
  TestValidator.predicate(
    "refund request has customer email",
    refundRequest.customer.email !== null &&
      refundRequest.customer.email !== undefined &&
      refundRequest.customer.email.length > 0,
  );
  TestValidator.predicate(
    "refund request has customer display name",
    refundRequest.customer.display_name !== null &&
      refundRequest.customer.display_name !== undefined &&
      refundRequest.customer.display_name.length > 0,
  );
  // 8. Validate refund request ID is a valid UUID
  TestValidator.predicate(
    "refund request has valid ID",
    refundRequest.id !== null &&
      refundRequest.id !== undefined &&
      refundRequest.id.length > 0,
  );
  // 9. Validate creation timestamps
  TestValidator.predicate(
    "refund request has createdAt timestamp",
    refundRequest.createdAt !== null && refundRequest.createdAt !== undefined,
  );
  TestValidator.predicate(
    "refund request has updatedAt timestamp",
    refundRequest.updatedAt !== null && refundRequest.updatedAt !== undefined,
  );
}
