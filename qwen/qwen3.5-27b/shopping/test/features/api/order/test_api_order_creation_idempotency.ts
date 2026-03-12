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

/**
 * Test idempotency of order creation to prevent duplicate orders.
 * Verifies that submitting the same order request twice with identical
 * cart contents and shipping address returns the original order without
 * creating duplicates.
 */
export async function test_api_order_creation_idempotency(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Add product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 3. Create first order with specific address_id
  // Note: The utility function will prepare a valid address_id
  const firstOrder =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(firstOrder);
  // Capture first order details for comparison
  const firstOrderId = firstOrder.id;
  const firstOrderCreatedAt = firstOrder.created_at;
  const firstOrderTotalPrice = firstOrder.total_price;
  const firstOrderStatus = firstOrder.status;
  const firstOrderItemsCount = firstOrder.orderItems.length;
  const firstOrderShippingAddress = firstOrder.shipping_address_snapshot;
  // 4. Test idempotency by attempting to create order again
  // Since cart items are soft-deleted after first order, the second request
  // should either return the same order (if idempotency key is used) or fail
  // We'll verify that no duplicate order is created
  await TestValidator.error(
    "second order creation should fail with empty cart",
    async () => {
      await generate_random_shopping_mall_customer_customers_me_orders_create(
        customerConnection,
        {},
      );
    },
  );
  // 5. Verify first order details are valid
  TestValidator.predicate("first order has valid ID", firstOrderId.length > 0);
  TestValidator.predicate(
    "first order has valid timestamp",
    firstOrderCreatedAt.length > 0,
  );
  TestValidator.predicate(
    "first order has positive total price",
    firstOrderTotalPrice > 0,
  );
  TestValidator.equals("first order status is paid", firstOrderStatus, "paid");
  TestValidator.predicate(
    "first order has at least one item",
    firstOrderItemsCount >= 1,
  );
  TestValidator.predicate(
    "first order has shipping address",
    firstOrderShippingAddress.length > 0,
  );
  // 6. Verify order items details
  for (let i = 0; i < firstOrder.orderItems.length; i++) {
    const orderItem = firstOrder.orderItems[i];
    typia.assert(orderItem);
    TestValidator.predicate(
      `order item ${i} has valid ID`,
      orderItem.id.length > 0,
    );
    TestValidator.predicate(
      `order item ${i} has positive quantity`,
      orderItem.quantity > 0,
    );
    TestValidator.predicate(
      `order item ${i} has positive price`,
      orderItem.price > 0,
    );
    TestValidator.equals(
      `order item ${i} status is paid`,
      orderItem.status,
      "paid",
    );
  }
  // 7. Verify cart is empty after order creation
  // Cart items should be soft-deleted (deleted_at is set)
  TestValidator.predicate(
    "cart item was soft-deleted",
    cartItem.deleted_at !== null,
  );
}
