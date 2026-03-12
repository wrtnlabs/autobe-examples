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
import { generate_random_shopping_mall_customer_customers_me_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_cart_items_create";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_order_creation_from_cart_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success path of order creation from shopping cart.
   * 1. Customer registration and authentication
   * 2. Add product variants to cart
   * 3. Create order from cart
   * 4. Validate order details and snapshots
   */
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Add product variants to shopping cart (2 different variants)
  const cartItem1 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 3. Create order from cart
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
  // 4. Validate order business logic
  TestValidator.equals("order status is paid", order.status, "paid");
  TestValidator.predicate(
    "shipping address snapshot exists",
    order.shipping_address_snapshot.length > 0,
  );
  TestValidator.predicate("total price is positive", order.total_price > 0);
  // 5. Validate order items business logic
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  for (const orderItem of order.orderItems) {
    typia.assert(orderItem);
    TestValidator.predicate("order item has quantity", orderItem.quantity > 0);
    TestValidator.predicate("order item has price", orderItem.price > 0);
    TestValidator.equals("order item status is paid", orderItem.status, "paid");
    TestValidator.predicate(
      "product snapshot exists",
      orderItem.productSnapshot.length > 0,
    );
    TestValidator.predicate(
      "variant snapshot exists",
      orderItem.variantSnapshot.length > 0,
    );
    TestValidator.predicate(
      "seller profile snapshot exists",
      orderItem.sellerProfileSnapshot.length > 0,
    );
    TestValidator.equals(
      "order item belongs to order",
      orderItem.orderId,
      order.id,
    );
  }
  // 6. Verify total price calculation
  const calculatedTotal = order.orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  TestValidator.equals(
    "total price matches sum of items",
    order.total_price,
    calculatedTotal,
  );
}
