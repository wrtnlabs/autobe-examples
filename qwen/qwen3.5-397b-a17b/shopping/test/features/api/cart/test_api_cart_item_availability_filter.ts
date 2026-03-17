import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test cart item filtering by availability status.
 *
 * This test validates that customers can filter cart items by availability status
 * to identify items that are out of stock or unavailable before checkout.
 *
 * Test Flow:
 * 1. Create seller account and authenticate
 * 2. Create a product with multiple variants
 * 3. Create customer account and authenticate
 * 4. Add multiple variants to customer's cart
 * 5. Retrieve cart with available=true filter (should return available items)
 * 6. Retrieve cart with available=false filter (should return unavailable items)
 * 7. Retrieve cart without filter (should return all items)
 * 8. Validate pagination records count matches filtered result size
 */
export async function test_api_cart_item_availability_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create multiple variants with different stock levels
  const variant1 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          stock_quantity: 100, // In stock
          options: [
            {
              key: "color",
              value: "Red",
            },
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  const variant2 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(9)}`,
          stock_quantity: 0, // Out of stock
          options: [
            {
              key: "color",
              value: "Blue",
            },
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // 4. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerAuth);
  // 5. Add both variants to customer's cart
  const cartItem1 =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant1.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant2.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 6. Retrieve cart with available=true filter
  const availableItems = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: {
        available: true,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(availableItems);
  // Validate available items
  TestValidator.equals(
    "available items count",
    availableItems.data.length,
    availableItems.pagination.records,
  );
  TestValidator.predicate(
    "all available items should have available=true",
    availableItems.data.every((item) => item.available === true),
  );
  TestValidator.predicate(
    "should have at least one available item",
    availableItems.data.length >= 1,
  );
  // 7. Retrieve cart with available=false filter
  const unavailableItems =
    await api.functional.shoppingMall.customer.cart.index(customerConnection, {
      body: {
        available: false,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(unavailableItems);
  // Validate unavailable items
  TestValidator.equals(
    "unavailable items count",
    unavailableItems.data.length,
    unavailableItems.pagination.records,
  );
  TestValidator.predicate(
    "all unavailable items should have available=false",
    unavailableItems.data.every((item) => item.available === false),
  );
  TestValidator.predicate(
    "should have at least one unavailable item",
    unavailableItems.data.length >= 1,
  );
  // 8. Retrieve cart without filter (all items)
  const allItems = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(allItems);
  // Validate all items
  TestValidator.equals(
    "total items count",
    allItems.data.length,
    allItems.pagination.records,
  );
  TestValidator.equals(
    "total equals available plus unavailable",
    allItems.pagination.records,
    availableItems.pagination.records + unavailableItems.pagination.records,
  );
  // 9. Validate item details
  const availableItem = availableItems.data[0];
  TestValidator.predicate(
    "available item has stock warning check",
    availableItem.stockWarning ===
      availableItem.quantity > availableItem.variant.stockQuantity,
  );
  if (unavailableItems.data.length > 0) {
    const unavailableItem = unavailableItems.data[0];
    TestValidator.equals(
      "unavailable item availability status",
      unavailableItem.available,
      false,
    );
  }
}
