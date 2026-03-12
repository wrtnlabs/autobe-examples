import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_me_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_cart_items_create";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_order_item_retrieve_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 2. Seller authentication (for product setup)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Customer adds product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Customer creates order from cart
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Verify order has items
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // Get first order item for retrieval test
  const firstOrderItem = order.orderItems[0];
  typia.assert(firstOrderItem);
  // 5. Customer retrieves specific order item
  const retrievedOrderItem =
    await api.functional.shoppingMall.customer.orders.items.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: firstOrderItem.id,
      },
    );
  typia.assert(retrievedOrderItem);
  // 6. Validate business logic - order item details match
  TestValidator.equals(
    "order item ID matches",
    retrievedOrderItem.id,
    firstOrderItem.id,
  );
  TestValidator.equals(
    "order ID matches",
    retrievedOrderItem.orderId,
    order.id,
  );
  TestValidator.predicate(
    "quantity is positive",
    retrievedOrderItem.quantity > 0,
  );
  TestValidator.predicate("price is positive", retrievedOrderItem.price > 0);
  // 7. Verify order item status is valid
  const validStatuses = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const;
  TestValidator.predicate(
    "status is valid",
    validStatuses.includes(
      retrievedOrderItem.status as (typeof validStatuses)[number],
    ),
  );
  // 8. Verify snapshots exist (business requirement: order items preserve historical data)
  TestValidator.predicate(
    "has product snapshot",
    retrievedOrderItem.productSnapshot.length > 0,
  );
  TestValidator.predicate(
    "has variant snapshot",
    retrievedOrderItem.variantSnapshot.length > 0,
  );
  TestValidator.predicate(
    "has seller profile snapshot",
    retrievedOrderItem.sellerProfileSnapshot.length > 0,
  );
  // 9. Verify parent order summary matches
  TestValidator.equals(
    "order summary ID matches",
    retrievedOrderItem.order.id,
    order.id,
  );
  TestValidator.equals(
    "order summary status matches",
    retrievedOrderItem.order.status,
    order.status,
  );
  // 10. Verify seller summary matches order item seller
  TestValidator.equals(
    "seller ID matches",
    retrievedOrderItem.seller.id,
    retrievedOrderItem.sellerId,
  );
  TestValidator.predicate(
    "seller has shop name",
    retrievedOrderItem.seller.shop_name.length > 0,
  );
  // 11. Verify shipments array exists (may be empty for new orders)
  TestValidator.predicate(
    "shipments is array",
    Array.isArray(retrievedOrderItem.shipments),
  );
  // 12. Verify active item is not deleted
  TestValidator.equals(
    "deleted at is null for active item",
    retrievedOrderItem.deletedAt,
    null,
  );
  // 13. Verify order item belongs to authenticated customer
  TestValidator.equals(
    "order belongs to authenticated customer",
    retrievedOrderItem.order.customer.id,
    customerAuth.id,
  );
}
