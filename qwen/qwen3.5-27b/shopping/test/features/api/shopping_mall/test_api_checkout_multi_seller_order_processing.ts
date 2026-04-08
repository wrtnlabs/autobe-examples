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
 * Test checkout with order items from multiple sellers to verify independent processing.
 *
 * Validates the complete multi-seller checkout flow including customer registration, address creation, cart management with products from different sellers, and order placement. Ensures that the order correctly handles items from multiple sellers with independent fulfillment tracking.
 *
 * Special attention is given to verifying that each order item is correctly associated with its respective seller, all items start with 'paid' status, and the order can accommodate independent shipment processing by different sellers.
 *
 * 1. Customer registers and authenticates via /auth/customer/join
 * 2. Customer creates a shipping address via /customer/addresses
 * 3. Customer adds product variants from different sellers to cart
 * 4. Customer proceeds to checkout with the shipping address ID
 * 5. Verify order is created with items from multiple sellers
 * 6. Verify each order item has correct seller association and 'paid' status
 * 7. Verify order status reflects multi-seller state
 */
export async function test_api_checkout_multi_seller_order_processing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 3. Add product variants from different sellers to cart
  // Adding 2 items from different sellers
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem2);
  // 4. Proceed to checkout
  const order =
    await generate_random_shopping_mall_customer_customers_me_checkout_create(
      customerConnection,
      {
        body: {
          shopping_mall_customer_address_id: address.id,
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // 5. Verify order contains items from multiple sellers
  TestValidator.predicate("order has multiple items", order.items.length >= 2);
  // 6. Verify each order item has correct seller association
  const sellerIds = new Set(order.items.map((item) => item.seller.id));
  TestValidator.predicate(
    "order contains items from multiple sellers",
    sellerIds.size >= 2,
  );
  // 7. Verify all items have 'paid' status initially
  TestValidator.predicate(
    "all items have paid status",
    order.items.every((item) => item.status === "paid"),
  );
  // 8. Verify shipping address matches the one created
  TestValidator.equals(
    "shipping address matches",
    order.shippingAddress.id,
    address.id,
  );
  // 9. Verify order items have correct snapshot data
  for (const item of order.items) {
    TestValidator.predicate(
      `item ${item.id} has product name snapshot`,
      item.product_name.length > 0,
    );
    TestValidator.predicate(
      `item ${item.id} has seller shop name snapshot`,
      item.seller_shop_name.length > 0,
    );
    TestValidator.predicate(
      `item ${item.id} has variant SKU snapshot`,
      item.variant_sku_code.length > 0,
    );
  }
}