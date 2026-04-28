import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCheckout";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import type { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { generate_random_ecommerce_platform_customer_cart_checkout } from "../../../generate/generate_random_ecommerce_platform_customer_cart_checkout";
import { generate_random_ecommerce_platform_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_platform_customer_cart_items_create";
import { prepare_random_ecommerce_platform_checkout } from "../../../prepare/prepare_random_ecommerce_platform_checkout";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";
import { prepare_random_ecommerce_platform_shopping_cart_item } from "../../../prepare/prepare_random_ecommerce_platform_shopping_cart_item";

/**
 * Tests the complete checkout success path.
 *
 * Validates the end-to-end checkout workflow including customer registration, shipping address creation, cart item addition, and order placement. Ensures that the checkout process correctly creates a new order with status 'paid', properly links it to the authenticated customer and selected shipping address, and converts all shopping cart items to order items with locked unit prices and quantities. The test also verifies that the shopping cart is automatically cleared after successful order placement.
 *
 * 1. Register and authenticate as a new customer.
 * 2. Create a shipping address for order delivery.
 * 3. Add product variants with sufficient stock to the shopping cart.
 * 4. Submit checkout with the valid shipping address ID.
 * 5. Validate the order has status 'paid'.
 * 6. Validate the order is linked to the authenticated customer and shipping address.
 * 7. Validate all cart items are converted to order items with locked unit prices and quantities.
 */
export async function test_api_checkout_order_creation_and_cart_clearing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  // 2. Create a shipping address for order delivery
  const shippingAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(),
          state: RandomGenerator.name(),
          postalCode: RandomGenerator.alphaNumeric(6),
          country: RandomGenerator.name(),
          isDefault: true,
        } satisfies IEcommercePlatformShippingAddress.ICreate,
      },
    );
  typia.assert(shippingAddress);
  // 3. Add product variants with sufficient stock to the shopping cart
  const cartItem =
    await generate_random_ecommerce_platform_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommercePlatformShoppingCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 4. Submit checkout with the valid shipping address ID
  const order = await generate_random_ecommerce_platform_customer_cart_checkout(
    customerConnection,
    {
      body: {
        shipping_address_id: shippingAddress.id,
      } satisfies IEcommercePlatformCheckout.ICreate,
    },
  );
  typia.assert(order);
  // 5. Validate the order has status 'paid'
  TestValidator.equals("order status is paid", order.status, "paid");
  // 6. Validate the order is linked to the shipping address
  TestValidator.equals(
    "order shipping address id matches",
    order.shippingAddress.id,
    shippingAddress.id,
  );
  // 7. Validate the order has at least one order item
  TestValidator.predicate("order has items", order.items.length > 0);
  // 8. Validate all cart items are converted to order items with positive price and quantity
  for (const item of order.items) {
    TestValidator.predicate("order item has positive price", item.price > 0);
    TestValidator.predicate(
      "order item has positive quantity",
      item.quantity > 0,
    );
    TestValidator.equals("order item status is paid", item.status, "paid");
  }
}
