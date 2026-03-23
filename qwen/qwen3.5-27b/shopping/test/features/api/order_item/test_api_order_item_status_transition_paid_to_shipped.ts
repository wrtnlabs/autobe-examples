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
 * Test order item status transition from 'paid' to 'shipped' by administrator.
 *
 * This test validates the complete workflow of:
 * 1. Creating admin and customer accounts
 * 2. Customer placing an order (creating order items with 'paid' status)
 * 3. Administrator updating order item status to 'shipped'
 * 4. Verifying the status transition and snapshot immutability
 */
export async function test_api_order_item_status_transition_paid_to_shipped(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Create an order as customer (this creates order items with 'paid' status)
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Validate order was created successfully
  TestValidator.predicate("order created", order.id != null);
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // Get the first order item to update
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // Validate initial order item state
  TestValidator.equals("initial status is paid", orderItem.status, "paid");
  TestValidator.predicate("order item has orderId", orderItem.orderId != null);
  TestValidator.predicate("order item has id", orderItem.id != null);
  // Store original snapshots for immutability verification
  const originalProductSnapshot = orderItem.productSnapshot;
  const originalVariantSnapshot = orderItem.variantSnapshot;
  const originalSellerProfileSnapshot = orderItem.sellerProfileSnapshot;
  const originalCreatedAt = orderItem.createdAt;
  // 4. As admin, update order item status to 'shipped'
  const updatedOrderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.update(
      adminConnection,
      {
        orderId: orderItem.orderId,
        itemId: orderItem.id,
        body: {
          status: "shipped",
        } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  typia.assert(updatedOrderItem);
  // 5. Validate status transition
  TestValidator.equals(
    "status changed to shipped",
    updatedOrderItem.status,
    "shipped",
  );
  // 6. Verify updatedAt is more recent than createdAt
  TestValidator.predicate(
    "updatedAt is after createdAt",
    new Date(updatedOrderItem.updatedAt).getTime() >=
      new Date(updatedOrderItem.createdAt).getTime(),
  );
  // 7. Verify snapshot immutability
  TestValidator.equals(
    "productSnapshot unchanged",
    updatedOrderItem.productSnapshot,
    originalProductSnapshot,
  );
  TestValidator.equals(
    "variantSnapshot unchanged",
    updatedOrderItem.variantSnapshot,
    originalVariantSnapshot,
  );
  TestValidator.equals(
    "sellerProfileSnapshot unchanged",
    updatedOrderItem.sellerProfileSnapshot,
    originalSellerProfileSnapshot,
  );
  // 8. Verify createdAt remains unchanged
  TestValidator.equals(
    "createdAt unchanged",
    updatedOrderItem.createdAt,
    originalCreatedAt,
  );
  // 9. Verify other order item properties preserved
  TestValidator.equals(
    "orderId preserved",
    updatedOrderItem.orderId,
    orderItem.orderId,
  );
  TestValidator.equals(
    "quantity preserved",
    updatedOrderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "price preserved",
    updatedOrderItem.price,
    orderItem.price,
  );
  TestValidator.equals(
    "sellerId preserved",
    updatedOrderItem.sellerId,
    orderItem.sellerId,
  );
}
