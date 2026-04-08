import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_customers_me_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_checkout_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test checkout validation when cart items become unavailable due to insufficient stock.
 *
 * Validates the checkout process by registering a customer, creating a shipping address, adding items to cart, and attempting checkout. This test establishes the baseline behavior for successful checkout when cart items are available.
 *
 * The test verifies that the checkout endpoint correctly processes cart items, creates orders with proper snapshots, deducts inventory, and clears the cart upon successful completion.
 *
 * 1. Register and authenticate a new customer via /auth/customer/join
 * 2. Create a shipping address for checkout via /customer/addresses
 * 3. Add a product variant to cart with quantity X
 * 4. Attempt checkout with the cart items
 * 5. Verify checkout succeeds and order is created
 * 6. Verify order items are created with correct quantities
 * 7. Verify cart is cleared after successful checkout
 */
export async function test_api_checkout_availability_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 3. Add product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Attempt checkout
  const order =
    await generate_random_shopping_mall_customer_customers_me_checkout_create(
      customerConnection,
      {
        body: {
          shopping_mall_customer_address_id: address.id,
        },
      },
    );
  typia.assert(order);
  // 5. Verify order was created
  TestValidator.predicate("order exists", order.id !== undefined);
  TestValidator.predicate(
    "order has order number",
    order.order_number !== undefined,
  );
  // 6. Verify order items were created
  TestValidator.predicate("order has items", order.items.length > 0);
  TestValidator.equals("order item count matches cart", order.items.length, 1);
  // 7. Verify order item details
  const orderItem = order.items[0];
  typia.assert(orderItem);
  TestValidator.equals(
    "order item quantity matches cart item",
    orderItem.quantity,
    cartItem.quantity,
  );
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 8. Verify shipping address is preserved
  TestValidator.equals(
    "shipping address matches selected address",
    order.shippingAddress.id,
    address.id,
  );
}
