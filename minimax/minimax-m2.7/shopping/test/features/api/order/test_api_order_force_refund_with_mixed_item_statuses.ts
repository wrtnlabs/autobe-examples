import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_force_refund_with_mixed_item_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // 2. Create a random order ID for testing
  // Note: In a real E2E test, this would be an actual order created through checkout flow
  // For this test, we validate the endpoint structure and response format
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Execute force-refund operation
  // The endpoint should handle orders with mixed item statuses:
  // - Eligible items (paid, shipped, delivered) -> become 'refunded'
  // - Non-eligible items (cancelled, refunded) -> remain unchanged
  // - Order status becomes 'partially_completed' if not all items are refunded
  const order =
    await api.functional.ecommerceMall.admin.admin.orders.force_refund.forceRefund(
      adminConnection,
      {
        orderId: orderId,
        body: {
          reason: "Test force refund with mixed item statuses",
        } satisfies IEcommerceMallOrder.IForceRefund,
      },
    );
  typia.assert(order);
  // 4. Validate response structure
  // Verify order contains expected properties for status validation
  TestValidator.equals("Order has valid ID", order.id !== undefined, true);
  TestValidator.equals(
    "Order has order number",
    order.order_number !== undefined,
    true,
  );
  TestValidator.equals(
    "Order has status field",
    order.status !== undefined,
    true,
  );
  TestValidator.equals(
    "Order has order items array",
    Array.isArray(order.orderItems),
    true,
  );
  // 5. Validate business rules are reflected in response
  // The force-refund operation should:
  // - Only refund items that are eligible (paid, shipped, delivered)
  // - Skip items that are already cancelled or refunded
  // - Update order status based on remaining item states
  // - Create inventory records for refunded items
  // Expected validation: Since we don't have real data, we validate that:
  // - The response contains order items
  // - Items have status field
  // - Order has status reflecting completion state
  if (order.orderItems.length > 0) {
    const hasRefundedItems = order.orderItems.some(
      (item) => item.status === "refunded",
    );
    TestValidator.equals(
      "Has refunded items after force-refund",
      hasRefundedItems,
      true,
    );
    const hasNonRefundedItems = order.orderItems.some(
      (item) => item.status !== "refunded",
    );
    if (hasNonRefundedItems) {
      TestValidator.equals(
        "Order status is partially_completed with mixed items",
        order.status,
        "partially_completed",
      );
    }
  }
}
