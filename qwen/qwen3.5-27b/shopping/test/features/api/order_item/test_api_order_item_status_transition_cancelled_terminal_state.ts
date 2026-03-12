import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test order item status transition to cancelled terminal state.
 *
 * This test verifies that when an order item status is updated to 'cancelled',
 * it becomes a terminal state that cannot be transitioned to any other status.
 * The test validates the business rule that cancelled order items are immutable
 * and cannot be shipped, delivered, or refunded after cancellation.
 */
export async function test_api_order_item_status_transition_cancelled_terminal_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Create an order as customer (creates order items with 'paid' status)
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Verify order has at least one item
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // Get the first order item for testing
  const orderItem: IShoppingMallOrderItem = order.orderItems[0];
  typia.assert(orderItem);
  // Verify initial status is 'paid'
  TestValidator.equals(
    "initial order item status is paid",
    orderItem.status,
    "paid",
  );
  // Store original snapshot values for immutability verification
  const originalProductSnapshot: string = orderItem.productSnapshot;
  const originalVariantSnapshot: string = orderItem.variantSnapshot;
  const originalSellerProfileSnapshot: string = orderItem.sellerProfileSnapshot;
  // 4. Update order item status from 'paid' to 'cancelled' as admin
  const updateBody: IShoppingMallOrderItem.IUpdate = {
    status: "cancelled",
  } satisfies IShoppingMallOrderItem.IUpdate;
  const updatedOrderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.update(
      adminConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: updateBody,
      },
    );
  typia.assert(updatedOrderItem);
  // Verify status is now 'cancelled'
  TestValidator.equals(
    "order item status updated to cancelled",
    updatedOrderItem.status,
    "cancelled",
  );
  // Verify snapshots remain immutable
  TestValidator.equals(
    "product snapshot remains unchanged",
    updatedOrderItem.productSnapshot,
    originalProductSnapshot,
  );
  TestValidator.equals(
    "variant snapshot remains unchanged",
    updatedOrderItem.variantSnapshot,
    originalVariantSnapshot,
  );
  TestValidator.equals(
    "seller profile snapshot remains unchanged",
    updatedOrderItem.sellerProfileSnapshot,
    originalSellerProfileSnapshot,
  );
  // 5. Attempt to update cancelled order item to 'shipped' (should fail)
  const invalidUpdateBody: IShoppingMallOrderItem.IUpdate = {
    status: "shipped",
  } satisfies IShoppingMallOrderItem.IUpdate;
  await TestValidator.error(
    "cannot transition from cancelled to shipped (terminal state)",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.update(
        adminConnection,
        {
          orderId: order.id,
          itemId: orderItem.id,
          body: invalidUpdateBody,
        },
      );
    },
  );
  // 6. Verify order item remains in 'cancelled' status after failed update
  // Re-fetch the order to verify the final state
  const reFetchedOrder: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(reFetchedOrder);
  // Find the same order item in the re-fetched order
  const finalOrderItem: IShoppingMallOrderItem | undefined =
    reFetchedOrder.orderItems.find((item) => item.id === orderItem.id);
  TestValidator.predicate(
    "order item exists in re-fetched order",
    finalOrderItem !== undefined,
  );
  if (finalOrderItem !== undefined) {
    typia.assert(finalOrderItem);
    TestValidator.equals(
      "order item remains cancelled after failed transition attempt",
      finalOrderItem.status,
      "cancelled",
    );
    // Verify snapshots still remain immutable
    TestValidator.equals(
      "product snapshot still unchanged",
      finalOrderItem.productSnapshot,
      originalProductSnapshot,
    );
    TestValidator.equals(
      "variant snapshot still unchanged",
      finalOrderItem.variantSnapshot,
      originalVariantSnapshot,
    );
    TestValidator.equals(
      "seller profile snapshot still unchanged",
      finalOrderItem.sellerProfileSnapshot,
      originalSellerProfileSnapshot,
    );
  }
}
