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
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * E2E test for checkout preparation with available items and default address.
 *
 * This test validates the successful checkout preparation flow for an authenticated
 * customer with available cart items and a valid default shipping address.
 *
 * Test scenario:
 * 1. Register and login a seller, create a product with variant and inventory
 * 2. Register and login a customer
 * 3. Add product variant to cart
 * 4. Create a shipping address set as default
 * 5. Call checkout prepare endpoint
 * 6. Validate: all items available, default address returned, totals calculated correctly
 */
export async function test_api_checkout_prepare_with_available_items_and_default_address(
  connection: api.IConnection,
): Promise<void> {
  // === SELLER SETUP ===
  // Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Login seller (seller needs approval status to create products)
  const sellerLoginAuth = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: "password",
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  // Create product with variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  const validatedPrice = variant.price ?? product.base_price;
  // Add inventory to the variant (restock)
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
      body: {
        operation: "restock",
        quantity: 10,
        reason: "Initial stock for checkout test",
      },
    },
  );
  // === CUSTOMER SETUP ===
  // Register and login customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // === ADD ITEM TO CART ===
  const cartQuantity = 2;
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: cartQuantity,
        },
      },
    );
  typia.assert(cartItem);
  // Calculate expected subtotal
  const expectedSubtotal = validatedPrice * cartQuantity;
  // === CREATE DEFAULT SHIPPING ADDRESS ===
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Test Recipient",
          phone: "01012345678",
          street_address: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postal_code: "12345",
          country: "Test Country",
          is_default: true,
        },
      },
    );
  typia.assert(address);
  // === CALL CHECKOUT PREPARE ===
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(checkoutPrepare);
  // === VALIDATE CHECKOUT PREPARE RESPONSE ===
  // Validate shipping address is returned
  TestValidator.equals(
    "shipping address exists",
    checkoutPrepare.shippingAddress !== null,
    true,
  );
  TestValidator.equals(
    "shipping address matches default",
    checkoutPrepare.shippingAddress!.id,
    address.id,
  );
  // Validate hasValidAddress flag
  TestValidator.equals(
    "has valid address",
    checkoutPrepare.hasValidAddress,
    true,
  );
  // Validate unavailable items count is zero
  TestValidator.equals(
    "no unavailable items",
    checkoutPrepare.unavailableItemsCount,
    0,
  );
  // Validate validated items array
  TestValidator.equals(
    "has validated items",
    checkoutPrepare.validatedItems.length > 0,
    true,
  );
  // Validate the item details
  const validatedItem = checkoutPrepare.validatedItems[0];
  TestValidator.equals("item id matches", validatedItem.id, cartItem.id);
  TestValidator.equals(
    "quantity matches",
    validatedItem.quantity,
    cartQuantity,
  );
  TestValidator.equals(
    "variant id matches",
    validatedItem.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "product id matches",
    validatedItem.product.id,
    product.id,
  );
  // Validate pricing
  TestValidator.equals(
    "validated price matches",
    validatedItem.validatedPrice,
    validatedPrice,
  );
  TestValidator.equals(
    "item subtotal matches",
    validatedItem.subtotal,
    expectedSubtotal,
  );
  // Validate status is available
  TestValidator.equals(
    "item status is available",
    validatedItem.status,
    "available",
  );
  // Validate totals
  TestValidator.equals(
    "subtotal matches sum of item subtotals",
    checkoutPrepare.subtotal,
    expectedSubtotal,
  );
  TestValidator.equals(
    "total equals subtotal (no shipping)",
    checkoutPrepare.total,
    checkoutPrepare.subtotal,
  );
}
