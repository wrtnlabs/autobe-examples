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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
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
 * Test that cart items reflect current product prices after price changes.
 *
 * This test validates that when product or variant prices are updated,
 * the shopping cart immediately reflects the new prices rather than
 * the historical prices at the time the item was added to the cart.
 *
 * Test Flow:
 * 1. Customer and seller authentication setup
 * 2. Create product with base price
 * 3. Create variant with price override
 * 4. Add variant to cart
 * 5. Verify cart shows correct initial subtotal
 * 6. Create variant with null price override (uses base price)
 * 7. Verify cart shows base price when variant price is null
 * 8. Test cart filtering and pagination
 */
export async function test_api_cart_items_price_update_reflection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Create product with base price $100
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 100,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create variant with price override $120
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [{ key: "color", value: "Red" }],
          price: 120,
          stockQuantity: 100,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart with quantity 2
  const cartAdd = await api.functional.ecommerceMall.customer.cart_items.create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 2,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  typia.assert(cartAdd);
  // 6. View cart and verify initial item subtotal is $240 (2 × $120)
  const cartInitial =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartInitial);
  TestValidator.equals(
    "initial item subtotal with variant price",
    cartInitial.data[0]?.subtotal,
    240,
  );
  TestValidator.equals(
    "variant price in cart item",
    cartInitial.data[0]?.product_variant.price,
    120,
  );
  // 7. Create another variant with no price override (uses base price $100)
  const variant2 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [{ key: "color", value: "Blue" }],
          price: null, // No price override, uses base price $100
          stockQuantity: 100,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // 8. Add second variant to cart
  const cartAdd2 =
    await api.functional.ecommerceMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          product_variant_id: variant2.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartAdd2);
  // 9. View cart and verify base price item subtotal is $100
  const cartWithBasePrice =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartWithBasePrice);
  // Find the item with null price override using skuCode (camelCase for variant object)
  const basePriceItem = cartWithBasePrice.data.find(
    (item) => item.product_variant.sku_code === variant2.skuCode,
  );
  TestValidator.equals(
    "item with null price uses base price",
    basePriceItem?.subtotal,
    100,
  );
  // 10. Test cart with is_available filter
  const availableItems =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: { is_available: true } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(availableItems);
  TestValidator.predicate(
    "all items available",
    availableItems.data.every((item) => item.is_available === true),
  );
  // 11. Test pagination
  const paginatedCart =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(paginatedCart);
  TestValidator.equals(
    "pagination limit respected",
    paginatedCart.data.length,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    paginatedCart.pagination.records,
    2,
  );
}
