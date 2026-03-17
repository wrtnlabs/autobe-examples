import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test combined category and price range filtering for product search.
 *
 * This test validates the product search endpoint with various filter combinations:
 * 1. Create seller account and authenticate
 * 2. Create multiple products in different categories with varying prices
 * 3. Test category_id filter to verify only products in specified category are returned
 * 4. Test minPrice filter to verify products >= minPrice are returned
 * 5. Test maxPrice filter to verify products <= maxPrice are returned
 * 6. Test combined minPrice and maxPrice filters
 * 7. Test combined category and price filters
 * 8. Test edge cases with exact min/max price boundaries
 * 9. Verify pagination works with filters
 * 10. Verify sorting works with filters
 */
export async function test_api_product_search_category_and_price_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      shop_name: RandomGenerator.name(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create test products with different categories and prices
  // We need to create products with known prices for testing
  // Generate a shared category ID for all products
  const categoryId = typia.random<IEntity>().id;
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: 10000,
        shopping_category_id: categoryId,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: 25000,
        shopping_category_id: categoryId,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  const product3 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: 50000,
        shopping_category_id: categoryId,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product3);
  const product4 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: 75000,
        shopping_category_id: categoryId,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product4);
  const product5 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: 100000,
        shopping_category_id: categoryId,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product5);
  // 3. Test category_id filter - filter by product1's category
  const categoryFilterResult = await api.functional.shoppingMall.products.index(
    sellerConnection,
    {
      body: {
        category_id: product1.category.id,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(categoryFilterResult);
  TestValidator.predicate(
    "category filter returns only products in category",
    categoryFilterResult.data.every(
      (p) => p.category.id === product1.category.id,
    ),
  );
  // 4. Test minPrice filter - products >= 30000
  const minPriceResult = await api.functional.shoppingMall.products.index(
    sellerConnection,
    {
      body: {
        minPrice: 30000,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(minPriceResult);
  TestValidator.predicate(
    "minPrice filter returns products >= 30000",
    minPriceResult.data.every((p) => p.basePrice >= 30000),
  );
  // 5. Test maxPrice filter - products <= 40000
  const maxPriceResult = await api.functional.shoppingMall.products.index(
    sellerConnection,
    {
      body: {
        maxPrice: 40000,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(maxPriceResult);
  TestValidator.predicate(
    "maxPrice filter returns products <= 40000",
    maxPriceResult.data.every((p) => p.basePrice <= 40000),
  );
  // 6. Test combined minPrice and maxPrice - products between 20000 and 60000
  const priceRangeResult = await api.functional.shoppingMall.products.index(
    sellerConnection,
    {
      body: {
        minPrice: 20000,
        maxPrice: 60000,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(priceRangeResult);
  TestValidator.predicate(
    "price range filter returns products between 20000 and 60000",
    priceRangeResult.data.every(
      (p) => p.basePrice >= 20000 && p.basePrice <= 60000,
    ),
  );
  // 7. Test combined category and price filters
  const combinedResult = await api.functional.shoppingMall.products.index(
    sellerConnection,
    {
      body: {
        category_id: product1.category.id,
        minPrice: 5000,
        maxPrice: 50000,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined category and price filters work correctly",
    combinedResult.data.every(
      (p) =>
        p.category.id === product1.category.id &&
        p.basePrice >= 5000 &&
        p.basePrice <= 50000,
    ),
  );
  // 8. Test edge case - exact minPrice boundary (product with price = 25000)
  const exactMinPriceResult = await api.functional.shoppingMall.products.index(
    sellerConnection,
    {
      body: {
        minPrice: 25000,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(exactMinPriceResult);
  TestValidator.predicate(
    "exact minPrice boundary includes products at minPrice",
    exactMinPriceResult.data.some((p) => p.basePrice === 25000),
  );
  // 9. Test edge case - exact maxPrice boundary (product with price = 75000)
  const exactMaxPriceResult = await api.functional.shoppingMall.products.index(
    sellerConnection,
    {
      body: {
        maxPrice: 75000,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(exactMaxPriceResult);
  TestValidator.predicate(
    "exact maxPrice boundary includes products at maxPrice",
    exactMaxPriceResult.data.some((p) => p.basePrice === 75000),
  );
  // 10. Test pagination with filters
  const paginatedResult = await api.functional.shoppingMall.products.index(
    sellerConnection,
    {
      body: {
        minPrice: 10000,
        page: 1,
        limit: 2,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination works with price filter",
    paginatedResult.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination metadata is correct",
    paginatedResult.pagination.current === 1 &&
      paginatedResult.pagination.limit === 2,
  );
  // 11. Test sorting with filters - sort by price ascending
  const sortedAscResult = await api.functional.shoppingMall.products.index(
    sellerConnection,
    {
      body: {
        minPrice: 10000,
        sort: "priceAsc",
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(sortedAscResult);
  TestValidator.predicate(
    "price ascending sort works with filter",
    sortedAscResult.data.every(
      (p, i) => i === 0 || sortedAscResult.data[i - 1].basePrice <= p.basePrice,
    ),
  );
  // 12. Test sorting with filters - sort by price descending
  const sortedDescResult = await api.functional.shoppingMall.products.index(
    sellerConnection,
    {
      body: {
        minPrice: 10000,
        sort: "priceDesc",
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(sortedDescResult);
  TestValidator.predicate(
    "price descending sort works with filter",
    sortedDescResult.data.every(
      (p, i) =>
        i === 0 || sortedDescResult.data[i - 1].basePrice >= p.basePrice,
    ),
  );
}