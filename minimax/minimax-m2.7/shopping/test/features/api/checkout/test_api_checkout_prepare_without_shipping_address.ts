import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test checkout preparation when customer has no shipping addresses.
 *
 * This test validates the checkout prepare endpoint behavior when a customer
 * attempts to prepare checkout without having any saved shipping addresses.
 *
 * Test scenarios:
 * 1. hasValidAddress is false in the response (no addresses exist)
 * 2. shippingAddress is null (cannot select any address)
 * 3. validatedItems still returns available items with correct status and pricing
 * 4. unavailableItemsCount is zero when all cart items are available
 * 5. subtotal and total are calculated correctly for available items
 *
 * Setup flow:
 * 1. Register and login as approved seller
 * 2. Create a product with variant (requires inventory)
 * 3. Register and login as customer (without adding any shipping address)
 * 4. Add product to cart
 * 5. Call checkout prepare endpoint
 * 6. Validate response structure and values
 */
export async function test_api_checkout_prepare_without_shipping_address(
  connection: api.IConnection,
): Promise<void> {
  // Generate a consistent password for this test session
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const customerPassword = RandomGenerator.alphaNumeric(16);
  // Step 1: Register and login as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword,
    },
  });
  typia.assert(seller);
  // Login as seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const loggedInSeller = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: seller.email,
      password: sellerPassword,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(loggedInSeller);
  // Step 2: Create a product with variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  TestValidator.predicate(
    "product has at least one variant",
    variant !== undefined,
  );
  // Step 3: Register and login as customer (without adding any shipping address)
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      password: customerPassword,
    },
  });
  typia.assert(customer);
  // Login as customer
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const loggedInCustomer = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customer.email,
        password: customerPassword,
        href: "https://example.com/customer",
        referrer: "https://example.com",
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(loggedInCustomer);
  // Step 4: Add product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerLoginConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // Step 5: Call checkout prepare endpoint
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerLoginConnection,
    );
  typia.assert(checkoutPrepare);
  // Step 6: Validate response
  // hasValidAddress should be false since customer has no shipping addresses
  TestValidator.equals(
    "hasValidAddress is false when no shipping addresses exist",
    checkoutPrepare.hasValidAddress,
    false,
  );
  // shippingAddress should be null when no addresses exist
  TestValidator.equals(
    "shippingAddress is null when customer has no addresses",
    checkoutPrepare.shippingAddress,
    null,
  );
  // validatedItems should contain the cart item
  TestValidator.predicate(
    "validatedItems contains at least one item",
    checkoutPrepare.validatedItems.length >= 1,
  );
  // Find our cart item in validated items
  const validatedItem = checkoutPrepare.validatedItems.find(
    (item) => item.id === cartItem.id,
  );
  TestValidator.predicate(
    "cart item found in validated items",
    validatedItem !== undefined,
  );
  // The item should be available (product and variant exist, stock is sufficient)
  if (validatedItem) {
    TestValidator.equals(
      "validated item status is available",
      validatedItem.status,
      "available",
    );
    // validatedPrice should match variant price or base price
    const expectedPrice = variant.price ?? product.base_price;
    TestValidator.equals(
      "validated price matches variant or base price",
      validatedItem.validatedPrice,
      expectedPrice,
    );
    // subtotal should be price * quantity
    TestValidator.equals(
      "subtotal calculation is correct",
      validatedItem.subtotal,
      expectedPrice * cartItem.quantity,
    );
  }
  // unavailableItemsCount should be 0 since items are available
  TestValidator.equals(
    "unavailable items count is zero when all items available",
    checkoutPrepare.unavailableItemsCount,
    0,
  );
  // subtotal should equal sum of available items subtotals
  const expectedSubtotal = checkoutPrepare.validatedItems
    .filter((item) => item.status === "available")
    .reduce((sum, item) => sum + item.subtotal, 0);
  TestValidator.equals(
    "subtotal equals sum of available items",
    checkoutPrepare.subtotal,
    expectedSubtotal,
  );
  // total should currently equal subtotal (no shipping fees implemented)
  TestValidator.equals(
    "total equals subtotal for available items",
    checkoutPrepare.total,
    expectedSubtotal,
  );
}
