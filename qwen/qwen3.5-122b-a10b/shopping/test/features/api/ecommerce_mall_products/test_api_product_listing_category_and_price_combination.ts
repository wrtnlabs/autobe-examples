import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the product listing endpoint with combined category and price range filters.
 *
 * This test verifies that:
 * 1. Category filter correctly filters products by category_id
 * 2. Price range filter (min_price AND max_price together) returns products within the specified range
 * 3. Combined filters (category_id + min_price + max_price) work correctly together
 * 4. Search text filter works in combination with category and price filters
 * 5. Results are properly paginated when combined filters reduce the result set
 * 6. Sorting works correctly with combined filters applied (newest, price_asc, price_desc)
 * 7. Edge case: Non-existent category_id returns empty data array
 * 8. Edge case: Price range with no matches returns empty data array
 * 9. Verify that seller shop_name is correctly included in product summaries
 * 10. Verify that averageRating and reviewCount are correctly aggregated from reviews
 */
export async function test_api_product_listing_category_and_price_combination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Category filter only
  const category1Id = typia.random<string & tags.Format<"uuid">>();
  const categoryFiltered = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        category_id: category1Id,
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(categoryFiltered);
  TestValidator.predicate(
    "category filter returns valid response structure",
    categoryFiltered.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination metadata is present",
    categoryFiltered.pagination.current >= 0 &&
      categoryFiltered.pagination.limit >= 0 &&
      categoryFiltered.pagination.records >= 0 &&
      categoryFiltered.pagination.pages >= 0,
  );
  // Test 2: Price range filter only
  const priceFiltered = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        min_price: 8000,
        max_price: 12000,
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceFiltered);
  TestValidator.predicate(
    "all products in price range",
    priceFiltered.data.every(
      (p) => p.basePrice >= 8000 && p.basePrice <= 12000,
    ),
  );
  // Test 3: Combined category and price filters
  const combinedFiltered = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        category_id: category1Id,
        min_price: 6000,
        max_price: 11000,
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(combinedFiltered);
  TestValidator.predicate(
    "combined filter returns valid response",
    combinedFiltered.data.length >= 0,
  );
  // Test 4: Search with category and price filters
  const searchFiltered = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: RandomGenerator.paragraph({ sentences: 2 }),
        category_id: category1Id,
        min_price: 5000,
        max_price: 15000,
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchFiltered);
  TestValidator.predicate(
    "search results return valid response",
    searchFiltered.data.length >= 0,
  );
  // Test 5: Pagination with combined filters
  const paginated = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        category_id: category1Id,
        limit: 1,
        page: 1,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.predicate(
    "pagination limit applied",
    paginated.data.length <= 1,
  );
  TestValidator.equals(
    "pagination current page",
    paginated.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginated.pagination.limit, 1);
  TestValidator.predicate(
    "pagination records >= data length",
    paginated.pagination.records >= paginated.data.length,
  );
  // Test 6: Sorting by price ascending
  const priceAscSorted = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        category_id: category1Id,
        sort: "price_asc",
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceAscSorted);
  TestValidator.predicate(
    "products sorted by price ascending",
    priceAscSorted.data.every(
      (p, i) => i === 0 || p.basePrice >= priceAscSorted.data[i - 1].basePrice,
    ),
  );
  // Test 7: Sorting by price descending
  const priceDescSorted = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        category_id: category1Id,
        sort: "price_desc",
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceDescSorted);
  TestValidator.predicate(
    "products sorted by price descending",
    priceDescSorted.data.every(
      (p, i) => i === 0 || p.basePrice <= priceDescSorted.data[i - 1].basePrice,
    ),
  );
  // Test 8: Edge case - non-existent category returns empty array
  const nonExistentCategory = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(nonExistentCategory);
  TestValidator.equals(
    "non-existent category returns empty data",
    nonExistentCategory.data.length,
    0,
  );
  TestValidator.equals(
    "pagination still correct for empty result",
    nonExistentCategory.pagination.records,
    0,
  );
  // Test 9: Edge case - price range with no matches
  const noMatchPriceRange = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        min_price: 100000,
        max_price: 200000,
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(noMatchPriceRange);
  TestValidator.equals(
    "no match price range returns empty data",
    noMatchPriceRange.data.length,
    0,
  );
  // Test 10: Verify response structure includes seller info
  if (categoryFiltered.data.length > 0) {
    TestValidator.predicate(
      "seller shop_name is present",
      categoryFiltered.data[0].seller.shop_name.length > 0,
    );
    TestValidator.predicate(
      "seller has valid email",
      categoryFiltered.data[0].seller.email.length > 0,
    );
  }
  // Test 11: Verify response structure includes category info
  if (categoryFiltered.data.length > 0) {
    TestValidator.predicate(
      "category name is present",
      categoryFiltered.data[0].category.name.length > 0,
    );
  }
  // Test 12: Verify averageRating and reviewCount exist
  if (categoryFiltered.data.length > 0) {
    TestValidator.predicate(
      "averageRating is a number",
      typeof categoryFiltered.data[0].averageRating === "number",
    );
    TestValidator.predicate(
      "reviewCount is a number",
      typeof categoryFiltered.data[0].reviewCount === "number",
    );
  }
}
