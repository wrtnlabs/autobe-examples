import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test authorization control ensuring customers can only access their own order items.
 *
 * Test Flow:
 * 1. Create and authenticate Customer A (order owner)
 * 2. Customer A adds a shipping address
 * 3. Customer A adds a product variant to cart
 * 4. Customer A creates an order from cart items
 * 5. Create and authenticate Customer B (unauthorized accessor)
 * 6. Customer B attempts to retrieve Customer A's order item
 * 7. Validate that Customer B receives 403 Forbidden error
 *
 * This verifies the authorization logic that checks the parent order's customer_id
 * matches the authenticated customer's ID.
 */
export async function test_api_order_item_access_control(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // STEP 1: Create Customer A (Order Owner)
  // ============================================
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // ============================================
  // STEP 2: Customer A Adds Shipping Address
  // ============================================
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerAConnection,
    {},
  );
  typia.assert(address);
  // ============================================
  // STEP 3: Customer A Adds Product to Cart
  // ============================================
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerAConnection,
      {},
    );
  typia.assert(cartItem);
  // ============================================
  // STEP 4: Customer A Creates Order
  // ============================================
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerAConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Extract order item ID from the created order
  const orderItem = order.orderItems[0];
  const orderId = order.id;
  const orderItemId = orderItem.id;
  TestValidator.predicate(
    "order has at least one item",
    () => order.orderItems.length > 0,
  );
  // ============================================
  // STEP 5: Create Customer B (Unauthorized)
  // ============================================
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // ============================================
  // STEP 6-7: Customer B Tries to Access Customer A's Order Item
  // ============================================
  await TestValidator.error(
    "Customer B cannot access Customer A's order item (403 Forbidden)",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.at(
        customerBConnection,
        {
          orderId: orderId,
          itemId: orderItemId,
        },
      );
    },
  );
}
