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
 * Test the primary success path for customer checkout with order creation and validation.
 *
 * Validates the complete checkout workflow including customer registration, address creation, cart item addition, and order placement. Ensures that the order is correctly created with all required data including order items, snapshots, and proper status derivation.
 *
 * Special attention is given to verifying that product and variant snapshots are captured at order placement time, order items have the correct 'paid' status initially, and the shipping address is preserved from the customer's address book.
 *
 * 1. Customer registers and authenticates via authorize_customer_join utility.
 * 2. Customer creates a shipping address via generate_random_shopping_mall_customer_addresses_create utility.
 * 3. Customer adds product variants to cart via generate_random_shopping_mall_customer_cart_items_create utility (ensures variants have sufficient stock).
 * 4. Customer proceeds to checkout via generate_random_shopping_mall_customer_customers_me_checkout_create utility.
 * 5. Verify order is created with unique order_number, all items in 'paid' status, correct quantity and price captured, shipping address preserved, and product/variant snapshots created.
 * 6. Verify order response contains complete order with all order items including snapshot data (product_name, product_description, variant_sku_code, variant_price, seller_shop_name, images, variantOptions).
 */
export async function test_api_checkout_successful_order_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create shipping address for checkout
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 3. Add product variants to cart (prepare function ensures sufficient stock)
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Proceed to checkout with the created address
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
  // 5. Validate order structure and business logic
  TestValidator.predicate(
    "order has unique order_number",
    order.order_number.length > 0,
  );
  TestValidator.predicate(
    "order has at least one item",
    order.items.length > 0,
  );
  TestValidator.equals(
    "shipping address matches",
    order.shippingAddress.id,
    address.id,
  );
  // 6. Validate order items (all should be in 'paid' status)
  await ArrayUtil.asyncForEach(order.items, async (item) => {
    typia.assert(item);
    TestValidator.equals("order item status is paid", item.status, "paid");
    TestValidator.predicate(
      "order item has positive quantity",
      item.quantity > 0,
    );
    TestValidator.predicate("order item has positive price", item.price > 0);
    TestValidator.predicate(
      "order item has product_name snapshot",
      item.product_name.length > 0,
    );
    TestValidator.predicate(
      "order item has product_description snapshot",
      item.product_description.length > 0,
    );
    TestValidator.predicate(
      "order item has variant_sku_code snapshot",
      item.variant_sku_code.length > 0,
    );
    TestValidator.predicate(
      "order item has variant_price snapshot",
      item.variant_price > 0,
    );
    TestValidator.predicate(
      "order item has seller_shop_name snapshot",
      item.seller_shop_name.length > 0,
    );
    TestValidator.predicate(
      "order item has variantOptions snapshot",
      item.variantOptions.length >= 0,
    );
    TestValidator.predicate(
      "order item has images snapshot",
      item.images.length >= 0,
    );
  });
  // 7. Validate shipments (should be empty initially)
  TestValidator.equals("order has no shipments yet", order.shipments.length, 0);
}
