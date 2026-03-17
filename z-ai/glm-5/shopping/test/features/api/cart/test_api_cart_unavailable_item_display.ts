import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test viewing a cart containing items where one variant has been deleted by the seller.
 *
 * Per section 125, items with deleted variants must remain visible in the cart
 * with unavailable=true flag set. The cart should display available items normally
 * while marking unavailable items appropriately. Total price excludes unavailable items.
 */
export async function test_api_cart_unavailable_item_display(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category);
  // 2. Seller setup - create product with two variants
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          categoryId: category.id,
          basePrice: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(product);
  // Create first variant (will remain available)
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: { color: "Blue", size: "Medium" },
          price: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<50000>
          >(),
        },
      },
    );
  typia.assert(variant1);
  // Create second variant (will be deleted to simulate unavailability)
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: { color: "Red", size: "Large" },
          price: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<50000>
          >(),
        },
      },
    );
  typia.assert(variant2);
  // 3. Add inventory for both variants
  await generate_random_shopping_mall_seller_variants_inventory_adjust(
    sellerConnection,
    {
      params: { variantId: variant1.id },
      body: {
        quantity_change: 100,
        reason: "Initial stock",
      },
    },
  );
  await generate_random_shopping_mall_seller_variants_inventory_adjust(
    sellerConnection,
    {
      params: { variantId: variant2.id },
      body: {
        quantity_change: 100,
        reason: "Initial stock",
      },
    },
  );
  // 4. Customer setup - add both variants to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const cartItem1 =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant1.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant2.id,
          quantity: 3,
        },
      },
    );
  typia.assert(cartItem2);
  // 5. Seller deletes the second variant to simulate unavailability
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant2.id,
    },
  );
  // 6. Customer views their cart
  const cart =
    await api.functional.shoppingMall.customer.carts.at(customerConnection);
  typia.assert(cart);
  // 7. Validate cart contents
  TestValidator.equals("cart should have 2 items", cart.items.length, 2);
  // Find the unavailable item (variant2) and available item (variant1)
  const unavailableItem = cart.items.find(
    (item) => item.variant.id === variant2.id,
  );
  const availableItem = cart.items.find(
    (item) => item.variant.id === variant1.id,
  );
  TestValidator.predicate(
    "unavailable item should exist",
    unavailableItem !== undefined,
  );
  TestValidator.predicate(
    "available item should exist",
    availableItem !== undefined,
  );
  // Validate unavailable item properties
  TestValidator.equals(
    "unavailable item should have unavailable=true",
    unavailableItem!.unavailable,
    true,
  );
  TestValidator.equals(
    "unavailable item should retain variant color option",
    unavailableItem!.variant.optionValues.color,
    "Red",
  );
  TestValidator.equals(
    "unavailable item should retain variant size option",
    unavailableItem!.variant.optionValues.size,
    "Large",
  );
  // Validate available item properties
  TestValidator.equals(
    "available item should have unavailable=false",
    availableItem!.unavailable,
    false,
  );
  // Validate total price only includes available items
  const variant1Price = variant1.price ?? product.base_price;
  const expectedTotal = variant1Price * 2;
  TestValidator.equals(
    "total price should only include available items",
    cart.total_price,
    expectedTotal,
  );
}
