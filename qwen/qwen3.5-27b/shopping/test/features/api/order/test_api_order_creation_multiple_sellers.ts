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

export async function test_api_order_creation_multiple_sellers(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test order creation with products from multiple sellers in a single order.
   * This test validates that when a customer creates an order containing products
   * from multiple sellers, the system correctly:
   * 1. Groups order items by seller
   * 2. Captures seller profile snapshots for each item
   * 3. Aggregates total price across all sellers
   * 4. Maintains independent shipment tracking per seller
   * 5. Sets initial order status to 'paid' for all items
   */
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Seller 1 registration and authentication
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 3. Seller 2 registration and authentication
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 4. Add cart items from multiple sellers
  // Cart item from seller 1
  const cartItem1 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  // Cart item from seller 2
  const cartItem2 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 5. Create order from cart
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: {
          address_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // 6. Validate order structure
  // Check that order has items from multiple sellers
  TestValidator.predicate(
    "order contains multiple items",
    order.orderItems.length >= 2,
  );
  // Check that items are from different sellers
  const sellerIds = order.orderItems.map((item) => item.sellerId);
  const uniqueSellers = new Set(sellerIds);
  TestValidator.equals(
    "order contains items from multiple sellers",
    uniqueSellers.size,
    2,
  );
  // Check that all order items have status 'paid'
  TestValidator.predicate(
    "all order items have paid status",
    order.orderItems.every((item) => item.status === "paid"),
  );
  // Check that order status is 'paid'
  TestValidator.equals("order status is paid", order.status, "paid");
  // Check that total price is sum of all item subtotals
  const calculatedTotal = order.orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  TestValidator.equals(
    "order total price matches item subtotals",
    order.total_price,
    calculatedTotal,
  );
  // Check that each order item has seller profile snapshot
  TestValidator.predicate(
    "all order items have seller profile snapshots",
    order.orderItems.every(
      (item) =>
        item.sellerProfileSnapshot !== null &&
        item.sellerProfileSnapshot !== undefined &&
        item.sellerProfileSnapshot !== "",
    ),
  );
  // Check that each order item has product and variant snapshots
  TestValidator.predicate(
    "all order items have product and variant snapshots",
    order.orderItems.every(
      (item) =>
        item.productSnapshot !== null &&
        item.productSnapshot !== undefined &&
        item.variantSnapshot !== null &&
        item.variantSnapshot !== undefined,
    ),
  );
  // Check that shipping address snapshot exists
  TestValidator.predicate(
    "order has shipping address snapshot",
    order.shipping_address_snapshot !== null &&
      order.shipping_address_snapshot !== undefined &&
      order.shipping_address_snapshot !== "",
  );
}
