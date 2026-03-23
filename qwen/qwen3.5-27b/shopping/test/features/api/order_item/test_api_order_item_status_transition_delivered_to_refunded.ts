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
 * Test order item status transition from delivered to refunded by administrator.
 *
 * This test validates the complete order item lifecycle:
 * 1. Admin and customer authentication
 * 2. Order creation by customer
 * 3. Status transitions: paid → shipped → delivered → refunded
 * 4. Validation of terminal state and snapshot immutability
 */
export async function test_api_order_item_status_transition_delivered_to_refunded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Create an order as customer
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Verify order was created with at least one item
  TestValidator.predicate(
    "order has at least one item",
    order.orderItems.length > 0,
  );
  const orderItem = order.orderItems[0];
  const orderId: string & tags.Format<"uuid"> = order.id;
  const itemId: string & tags.Format<"uuid"> = orderItem.id;
  // Verify initial status is 'paid'
  TestValidator.equals("initial status is paid", orderItem.status, "paid");
  // Store initial snapshots for immutability verification
  const initialProductSnapshot = orderItem.productSnapshot;
  const initialVariantSnapshot = orderItem.variantSnapshot;
  const initialSellerProfileSnapshot = orderItem.sellerProfileSnapshot;
  const initialPrice = orderItem.price;
  const initialQuantity = orderItem.quantity;
  // 4. Admin updates status to 'shipped' (paid → shipped)
  const shippedItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.update(
      adminConnection,
      {
        orderId,
        itemId,
        body: { status: "shipped" } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  typia.assert(shippedItem);
  TestValidator.equals(
    "status transitioned to shipped",
    shippedItem.status,
    "shipped",
  );
  TestValidator.predicate(
    "shipped updated_at is after initial",
    new Date(shippedItem.updatedAt) > new Date(orderItem.updatedAt),
  );
  // 5. Admin updates status to 'delivered' (shipped → delivered)
  const deliveredItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.update(
      adminConnection,
      {
        orderId,
        itemId,
        body: { status: "delivered" } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  typia.assert(deliveredItem);
  TestValidator.equals(
    "status transitioned to delivered",
    deliveredItem.status,
    "delivered",
  );
  TestValidator.predicate(
    "delivered updated_at is after shipped",
    new Date(deliveredItem.updatedAt) > new Date(shippedItem.updatedAt),
  );
  // 6. Admin updates status to 'refunded' (delivered → refunded)
  const refundedItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.update(
      adminConnection,
      {
        orderId,
        itemId,
        body: { status: "refunded" } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  typia.assert(refundedItem);
  TestValidator.equals(
    "status transitioned to refunded",
    refundedItem.status,
    "refunded",
  );
  TestValidator.predicate(
    "refunded updated_at is after delivered",
    new Date(refundedItem.updatedAt) > new Date(deliveredItem.updatedAt),
  );
  // Verify snapshot immutability throughout all transitions
  TestValidator.equals(
    "product snapshot remains unchanged",
    refundedItem.productSnapshot,
    initialProductSnapshot,
  );
  TestValidator.equals(
    "variant snapshot remains unchanged",
    refundedItem.variantSnapshot,
    initialVariantSnapshot,
  );
  TestValidator.equals(
    "seller profile snapshot remains unchanged",
    refundedItem.sellerProfileSnapshot,
    initialSellerProfileSnapshot,
  );
  TestValidator.equals(
    "price remains unchanged",
    refundedItem.price,
    initialPrice,
  );
  TestValidator.equals(
    "quantity remains unchanged",
    refundedItem.quantity,
    initialQuantity,
  );
  // Verify 'refunded' is a terminal state
  await TestValidator.error(
    "cannot transition from refunded to other status",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.update(
        adminConnection,
        {
          orderId,
          itemId,
          body: { status: "shipped" } satisfies IShoppingMallOrderItem.IUpdate,
        },
      );
    },
  );
}