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
 * Test that order item status is correctly tracked and visible through the retrieval endpoint.
 *
 * This test validates the complete order item lifecycle:
 * 1. Customer account creation and authentication
 * 2. Shipping address setup for order delivery
 * 3. Product variant addition to shopping cart
 * 4. Order creation with automatic status initialization to 'paid'
 * 5. Order item retrieval and status verification
 * 6. Snapshot data integrity validation (product, variant, seller, price)
 *
 * The test ensures that order items preserve transaction state at the time of purchase
 * and accurately reflect the fulfillment status for customer order tracking purposes.
 */
export async function test_api_order_item_status_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Add shipping address for order delivery
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 3. Add product variant to shopping cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Create order with the cart items
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Validate order was created with at least one item
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 5. Retrieve the first order item to verify status tracking
  const orderItem = order.orderItems[0];
  const retrievedItem =
    await api.functional.shoppingMall.customer.orders.items.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(retrievedItem);
  // Verify initial status is 'paid' after successful order creation
  TestValidator.equals("initial status", retrievedItem.status, "paid");
  // Verify snapshotted product information is preserved
  TestValidator.predicate(
    "product price range min exists",
    retrievedItem.product.min >= 0,
  );
  TestValidator.predicate(
    "product price range max exists",
    retrievedItem.product.max >= 0,
  );
  TestValidator.predicate(
    "variant SKU exists",
    retrievedItem.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "seller info exists",
    retrievedItem.seller.id.length > 0,
  );
  // Verify price and quantity are captured correctly
  TestValidator.predicate("price is positive", retrievedItem.price > 0);
  TestValidator.predicate("quantity is positive", retrievedItem.quantity >= 1);
  // Verify timestamps are valid
  TestValidator.predicate(
    "created_at is valid",
    retrievedItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrievedItem.updated_at.length > 0,
  );
  // Verify order item ID matches
  TestValidator.equals("order item id matches", retrievedItem.id, orderItem.id);
}
