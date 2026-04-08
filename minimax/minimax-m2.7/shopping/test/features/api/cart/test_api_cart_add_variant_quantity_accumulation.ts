import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
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
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_customer_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_me_cart_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test quantity accumulation when adding the same variant twice to cart.
 *
 * Validates the business rule that each product variant can only appear once per
 * shopping cart due to database uniqueness constraint. When the same variant is
 * added multiple times, the system accumulates quantity rather than creating
 * duplicate cart item lines. This test verifies the complete flow including:
 *
 * 1. Administrative setup: Category creation by admin
 * 2. Seller onboarding: Registration, approval simulation, and product/variant creation
 * 3. Customer authentication and cart operations
 * 4. Quantity accumulation validation (2 + 3 = 5)
 * 5. Subtotal calculation accuracy (quantity × price)
 * 6. Cart total computation
 *
 * The test ensures that the cart correctly handles duplicate variant additions
 * by merging quantities and maintaining accurate pricing calculations.
 */
export async function test_api_cart_add_variant_quantity_accumulation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category for product assignment
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const sellerAuth = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerConnection.headers?.["Authorization"]
        ?.toString()
        .includes("@")
        ? sellerConnection.headers?.["Authorization"]?.toString()
        : typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerAuth);
  // 3. Seller creates product under the category
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(12),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
          optionValues: [
            {
              key: "Color",
              value: RandomGenerator.pick(["Red", "Blue", "Green"] as const),
            },
            {
              key: "Size",
              value: RandomGenerator.pick(["S", "M", "L"] as const),
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // 5. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 6. Customer adds variant to cart FIRST time with quantity 2
  const cartFirst = await api.functional.ecommerceMall.customer.me.cart.create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 2,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  typia.assert(cartFirst);
  // Validate first add: exactly one item, quantity = 2
  TestValidator.equals(
    "cart has exactly one item after first add",
    cartFirst.items.length,
    1,
  );
  const firstCartItem = cartFirst.items[0];
  TestValidator.equals(
    "first cart item quantity is 2",
    firstCartItem.quantity,
    2,
  );
  // 7. Customer adds SAME variant to cart SECOND time with quantity 3
  const cartSecond = await api.functional.ecommerceMall.customer.me.cart.create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 3,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  typia.assert(cartSecond);
  // 8. Validate quantity accumulation
  // Due to database uniqueness constraint, only ONE cart item should exist
  TestValidator.equals(
    "only one cart item exists for variant",
    cartSecond.items.length,
    1,
  );
  const accumulatedCartItem = cartSecond.items[0];
  // Combined quantity should be 2 + 3 = 5
  TestValidator.equals(
    "quantity accumulated to 5",
    accumulatedCartItem.quantity,
    5,
  );
  // Validate variant reference is correct
  TestValidator.equals(
    "variant id matches original",
    accumulatedCartItem.variant.id,
    variant.id,
  );
  // Calculate expected price (variant price or product base price fallback)
  const expectedPrice = variant.price ?? product.basePrice;
  // Validate subtotal calculation: quantity × unit price
  const expectedSubtotal = accumulatedCartItem.quantity * expectedPrice;
  TestValidator.equals(
    "subtotal correctly calculated",
    accumulatedCartItem.subtotal,
    expectedSubtotal,
  );
  // Validate cart total matches item subtotal (single item)
  TestValidator.equals(
    "cart total equals item subtotal",
    cartSecond.total,
    accumulatedCartItem.subtotal,
  );
  // Additional validation: subtotal should be 5 × price
  TestValidator.equals(
    "subtotal is 5 times unit price",
    accumulatedCartItem.subtotal,
    5 * expectedPrice,
  );
}
