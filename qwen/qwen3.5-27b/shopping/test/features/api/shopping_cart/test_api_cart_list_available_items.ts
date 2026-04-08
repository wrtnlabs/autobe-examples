import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that an authenticated customer can view their shopping cart items with complete product information.
 *
 * Validates the complete cart listing flow including seller product setup, customer authentication, cart item creation, and cart retrieval. Ensures that cart items correctly reference product variants and products, and that computed fields like subtotal are accurate.
 *
 * Special attention is given to verifying that the product and variant information is correctly joined, subtotal calculations are accurate (quantity × unit price), and availability flags reflect stock status.
 *
 * 1. Seller registers and authenticates to create products.
 * 2. Seller creates a product with a base price.
 * 3. Seller creates two variants with different options and initial stock.
 * 4. Customer registers and authenticates.
 * 5. Customer adds first variant to cart with quantity 2.
 * 6. Customer adds second variant to cart with quantity 3.
 * 7. Customer retrieves cart items with default pagination.
 * 8. Validates cart items contain correct product and variant information.
 * 9. Validates subtotal calculations are accurate.
 * 10. Validates availability flags are true for items with stock.
 */
export async function test_api_cart_list_available_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(product);
  // 3. Seller creates first variant with options and stock
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "VAR-001-RED-L",
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant1);
  // 4. Seller creates second variant with different options
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "VAR-002-BLUE-M",
          variantOptions: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
          initialStockQuantity: 15,
        },
      },
    );
  typia.assert(variant2);
  // 5. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 6. Customer adds first variant to cart with quantity 2
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant1.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem1);
  // 7. Customer adds second variant to cart with quantity 3
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant2.id,
          quantity: 3,
        },
      },
    );
  typia.assert(cartItem2);
  // 8. Customer retrieves cart items with default pagination (empty body)
  const cartItemsResponse =
    await api.functional.shoppingMall.customer.carts.index(customerConnection, {
      body: {},
    });
  typia.assert(cartItemsResponse);
  // 9. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    cartItemsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is default 20",
    cartItemsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "total records is 2",
    cartItemsResponse.pagination.records,
    2,
  );
  TestValidator.equals(
    "total pages is 1",
    cartItemsResponse.pagination.pages,
    1,
  );
  // 10. Validate cart items count
  TestValidator.equals(
    "cart items count is 2",
    cartItemsResponse.data.length,
    2,
  );
  // 11. Validate first cart item (variant1, quantity 2)
  const firstItem = cartItemsResponse.data[0];
  TestValidator.equals("first item quantity is 2", firstItem.quantity, 2);
  TestValidator.equals(
    "first item variant matches variant1",
    firstItem.productVariant.id,
    variant1.id,
  );
  TestValidator.equals(
    "first item product matches product",
    firstItem.product.id,
    product.id,
  );
  TestValidator.equals("first item is available", firstItem.available, true);
  // Validate subtotal calculation for first item
  const firstItemUnitPrice = variant1.price ?? product.base_price;
  const expectedFirstSubtotal = firstItemUnitPrice * 2;
  TestValidator.equals(
    "first item subtotal is correct",
    firstItem.subtotal,
    expectedFirstSubtotal,
  );
  // 12. Validate second cart item (variant2, quantity 3)
  const secondItem = cartItemsResponse.data[1];
  TestValidator.equals("second item quantity is 3", secondItem.quantity, 3);
  TestValidator.equals(
    "second item variant matches variant2",
    secondItem.productVariant.id,
    variant2.id,
  );
  TestValidator.equals(
    "second item product matches product",
    secondItem.product.id,
    product.id,
  );
  TestValidator.equals("second item is available", secondItem.available, true);
  // Validate subtotal calculation for second item
  const secondItemUnitPrice = variant2.price ?? product.base_price;
  const expectedSecondSubtotal = secondItemUnitPrice * 3;
  TestValidator.equals(
    "second item subtotal is correct",
    secondItem.subtotal,
    expectedSecondSubtotal,
  );
  // 13. Validate sorting (newest first by created_at DESC)
  TestValidator.predicate(
    "items sorted by created_at DESC",
    new Date(firstItem.created_at) >= new Date(secondItem.created_at),
  );
}
