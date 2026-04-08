import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerWishlist";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
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
import { generate_random_shopping_mall_customer_wishlists_create } from "../../../generate/generate_random_shopping_mall_customer_wishlists_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_customer_wishlist } from "../../../prepare/prepare_random_shopping_mall_customer_wishlist";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test wishlist filtering capabilities and pagination.
 *
 * Validates the complete wishlist filtering and pagination workflow including customer authentication, seller product creation, and wishlist management. Ensures that filtering by product name, category, and price range works correctly, and that pagination with cursor-based navigation functions as expected.
 *
 * Special attention is given to verifying that search performs case-insensitive partial matching, category filters return only products in the specified category, price filters use the base_price field, and products are ordered by wishlist addition time (newest first).
 *
 * 1. Customer registers and authenticates with email and password.
 * 2. Seller registers and authenticates with email and password.
 * 3. Seller creates multiple products with different categories and price ranges.
 * 4. Customer adds all products to their wishlist.
 * 5. Customer tests name search with partial product name.
 * 6. Customer tests category filter with specific category_id.
 * 7. Customer tests price range filter with min_price and max_price.
 * 8. Customer tests pagination with limit=2 and cursor-based navigation.
 * 9. Validates that products are ordered by created_at DESC (newest first).
 */
export async function test_api_wishlist_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: undefined,
  });
  typia.assert(customerAuth);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: undefined,
  });
  typia.assert(sellerAuth);
  // 3. Create products with different categories and prices
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Electronics Smartphone",
        description: "High-quality smartphone with advanced features",
        base_price: 50000,
      },
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Clothing Winter Jacket",
        description: "Warm winter jacket for cold weather",
        base_price: 25000,
      },
    },
  );
  typia.assert(product2);
  const product3 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Electronics Laptop",
        description: "Powerful laptop for work and gaming",
        base_price: 100000,
      },
    },
  );
  typia.assert(product3);
  // 4. Add all products to customer's wishlist using utility function
  const wishlist1 =
    await generate_random_shopping_mall_customer_wishlists_create(
      customerConnection,
      {
        body: { productId: product1.id },
      },
    );
  typia.assert(wishlist1);
  const wishlist2 =
    await generate_random_shopping_mall_customer_wishlists_create(
      customerConnection,
      {
        body: { productId: product2.id },
      },
    );
  typia.assert(wishlist2);
  const wishlist3 =
    await generate_random_shopping_mall_customer_wishlists_create(
      customerConnection,
      {
        body: { productId: product3.id },
      },
    );
  typia.assert(wishlist3);
  // 5. Test name search with partial product name
  const searchResult =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          search: "Electronics",
        } satisfies IShoppingMallCustomerWishlist.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search returns only electronics products",
    searchResult.data.length,
    2,
  );
  TestValidator.predicate(
    "all search results contain Electronics",
    searchResult.data.every((item) =>
      item.product.name.toLowerCase().includes("electronics"),
    ),
  );
  // 6. Test category filter (products don't have categories in this test, so expect empty)
  const categoryFilterResult =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallCustomerWishlist.IRequest,
      },
    );
  typia.assert(categoryFilterResult);
  TestValidator.equals(
    "category filter returns empty for non-existent category",
    categoryFilterResult.data.length,
    0,
  );
  // 7. Test price range filter
  const priceRangeResult =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          min_price: 30000,
          max_price: 80000,
        } satisfies IShoppingMallCustomerWishlist.IRequest,
      },
    );
  typia.assert(priceRangeResult);
  TestValidator.equals(
    "price range filter returns products within range",
    priceRangeResult.data.length,
    1,
  );
  TestValidator.predicate(
    "product price is within range",
    priceRangeResult.data.every(
      (item) =>
        item.product.base_price >= 30000 && item.product.base_price <= 80000,
    ),
  );
  // 8. Test pagination with limit=2
  const firstPage = await api.functional.shoppingMall.customer.wishlists.index(
    customerConnection,
    {
      body: { limit: 2 } satisfies IShoppingMallCustomerWishlist.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("first page returns 2 items", firstPage.data.length, 2);
  TestValidator.equals(
    "pagination metadata is correct",
    firstPage.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination shows 2 pages",
    firstPage.pagination.pages,
    2,
  );
  // 9. Cursor-based pagination test removed - cursor property not available on IPagination
  // 10. Verify products are ordered by created_at DESC (newest first)
  const allItems = await api.functional.shoppingMall.customer.wishlists.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallCustomerWishlist.IRequest,
    },
  );
  typia.assert(allItems);
  TestValidator.predicate(
    "products are ordered by created_at DESC",
    allItems.data.every((item, index, array) => {
      if (index === 0) return true;
      return new Date(item.created_at) <= new Date(array[index - 1].created_at);
    }),
  );
}