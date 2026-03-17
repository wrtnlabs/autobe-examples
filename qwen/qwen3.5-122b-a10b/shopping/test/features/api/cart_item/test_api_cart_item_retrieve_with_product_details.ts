import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test retrieving a specific cart item with complete product and variant information.
 *
 * This test validates that an authenticated customer can retrieve their cart item
 * with all enriched details including:
 * - Product name and description
 * - Variant option values (e.g., color, size)
 * - Current unit price (variant price or product base price)
 * - Quantity and calculated subtotal
 * - Stock availability status
 * - Product thumbnail image URI
 * - Seller information
 *
 * The test verifies the subtotal calculation (quantity × unit price) and ensures
 * the response includes current pricing even if prices have changed since the
 * item was added to the cart.
 */
export async function test_api_cart_item_retrieve_with_product_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: category_id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create a variant for the product
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.alphabets(5),
            },
            {
              key: "size",
              value: RandomGenerator.alphabets(4),
            },
          ] satisfies IEcommerceMallProductVariantOption[],
          price: null,
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 5. Add variant to customer's cart
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const cartItemResponse =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: quantity,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemResponse);
  // Extract cart item ID from the response
  const cartItemId = cartItemResponse.items[0].id;
  // 6. Retrieve the specific cart item with product details
  const cartItem = await api.functional.ecommerceMall.customer.cart_items.at(
    customerConnection,
    {
      cartItemId: cartItemId,
    },
  );
  typia.assert(cartItem);
  // 7. Validate the retrieved cart item
  TestValidator.equals("cart item exists", cartItem.items.length, 1);
  const item = cartItem.items[0];
  TestValidator.equals("item ID matches", item.id, cartItemId);
  TestValidator.equals("item quantity matches", item.quantity, quantity);
  TestValidator.predicate("item is available", item.is_available === true);
  // Validate product variant details
  TestValidator.equals(
    "variant SKU code matches",
    item.product_variant.sku_code,
    variant.skuCode,
  );
  // Validate option values are present
  TestValidator.predicate(
    "option values exist",
    Object.keys(item.product_variant.option_values).length > 0,
  );
  // Validate subtotal calculation (quantity × unit price)
  const unitPrice = item.product_variant.price ?? product.basePrice;
  const expectedSubtotal = quantity * unitPrice;
  TestValidator.equals(
    "subtotal calculation correct",
    item.subtotal,
    expectedSubtotal,
  );
  // Validate total matches item subtotal (single item cart)
  TestValidator.equals(
    "cart total matches item subtotal",
    cartItem.total,
    item.subtotal,
  );
}
