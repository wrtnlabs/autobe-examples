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
 * Test viewing a cart containing multiple available product variants from the same seller.
 * Validates cart item display, ordering, pricing, and availability status.
 */
export async function test_api_cart_multiple_items_available(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - create product and variants
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: category.id,
          basePrice: typia.random<
            number & tags.Minimum<10> & tags.Maximum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 3. Create two different product variants
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: { color: "Red", size: "Large" },
          price: product.base_price + 10,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: { color: "Blue", size: "Medium" },
          price: product.base_price + 5,
        },
      },
    );
  typia.assert(variant2);
  // 4. Add inventory for both variants
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
        quantity_change: 50,
        reason: "Initial stock",
      },
    },
  );
  // 5. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 6. Add items to cart with different quantities
  const quantity1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const quantity2 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const cartItem1 =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant1.id,
          quantity: quantity1,
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
          quantity: quantity2,
        },
      },
    );
  typia.assert(cartItem2);
  // 7. Get cart and validate
  const cart =
    await api.functional.shoppingMall.customer.carts.at(customerConnection);
  typia.assert(cart);
  // Validate cart has exactly 2 items
  TestValidator.equals("cart item count", cart.items.length, 2);
  // Validate all items are available (unavailable = false)
  TestValidator.predicate(
    "all items available",
    cart.items.every((item) => item.unavailable === false),
  );
  // Validate items are ordered by creation timestamp (oldest first)
  TestValidator.predicate(
    "items ordered by creation timestamp",
    cart.items[0].created_at <= cart.items[1].created_at,
  );
  // Validate cart total price equals sum of all item subtotals
  const expectedTotal = cart.items.reduce((sum, item) => {
    const unitPrice = item.variant.price ?? product.base_price;
    return sum + unitPrice * item.quantity;
  }, 0);
  TestValidator.equals(
    "total price matches sum of subtotals",
    cart.total_price,
    expectedTotal,
  );
  // Validate variant information is correctly retrieved
  TestValidator.equals(
    "first variant skuCode",
    cart.items[0].variant.skuCode,
    variant1.sku_code,
  );
  TestValidator.equals(
    "second variant skuCode",
    cart.items[1].variant.skuCode,
    variant2.sku_code,
  );
  // Validate option values are present
  TestValidator.predicate(
    "variant option values present",
    cart.items.every(
      (item) => Object.keys(item.variant.optionValues).length > 0,
    ),
  );
  // Validate stock quantity is available (positive)
  TestValidator.predicate(
    "variant stock quantity available",
    cart.items.every((item) => item.variant.stockQuantity > 0),
  );
}
