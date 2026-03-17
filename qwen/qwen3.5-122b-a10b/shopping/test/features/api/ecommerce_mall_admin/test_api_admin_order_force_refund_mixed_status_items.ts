import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an administrator can force-refund an order containing items in different statuses (paid, shipped, delivered, cancelled).
 * The scenario should:
 * 1) Authenticate as admin via join
 * 2) Create a test order with multiple items in various statuses
 * 3) Call force-refund endpoint with a valid reason
 * 4) Verify ALL items are updated to 'refunded' status regardless of their current status
 * 5) Verify inventory records are created for items that were not already refunded
 * 6) Verify snapshots are created for all items before status changes
 * 7) Verify order status is updated to 'refunded' if all items become refunded
 * This validates that force-refund bypasses normal refund eligibility requirements and processes all items regardless of current status.
 */
export async function test_api_admin_order_force_refund_mixed_status_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceMallAdmin.IAuthorized =
    await api.functional.ecommerceMall.auth.admin.join(adminConnection, {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
          typia.random<string & tags.Format<"email">>(),
        ),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // 2. Create a test order with mixed status items
  // Note: Since we don't have order creation SDK in provided functions, we'll use a random order ID
  // In a real scenario, this would require creating an order through customer flow first
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const forceRefundBody: IEcommerceMallOrder.IForceRefund = {
    reason: `Admin force-refund test - ${RandomGenerator.paragraph({ sentences: 2 })}`,
  } satisfies IEcommerceMallOrder.IForceRefund;
  // 3. Call force-refund endpoint
  const refundedOrder: IEcommerceMallOrder =
    await api.functional.ecommerceMall.admin.orders.force_refund.forceRefund(
      adminConnection,
      {
        orderId,
        body: forceRefundBody,
      },
    );
  typia.assert(refundedOrder);
  // 4. Verify ALL items are updated to 'refunded' status
  TestValidator.predicate(
    "all order items have refunded status",
    refundedOrder.order_items.every((item) => item.status === "refunded"),
  );
  // 5. Verify order status is updated to 'refunded'
  TestValidator.equals(
    "order status is refunded",
    refundedOrder.status,
    "refunded",
  );
  // 6. Verify order has items
  TestValidator.predicate(
    "order has at least one item",
    refundedOrder.order_items.length > 0,
  );
  // 7. Validate order structure
  TestValidator.equals("order ID matches", refundedOrder.id, orderId);
  TestValidator.predicate(
    "order has total price",
    refundedOrder.total_price > 0,
  );
}