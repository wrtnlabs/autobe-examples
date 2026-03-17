import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSearch";
import type { IEcommerceMallSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSearchResult";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSearchResult";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_search_basic_functionality(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection for search (search is available to authenticated users)
  const customerConnection: api.IConnection = { host: connection.host };
  // Test 1: Basic search with short query
  const shortQuery = "test";
  const shortResult = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: shortQuery,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(shortResult);
  // Validate pagination metadata for short query
  TestValidator.equals("current page is 1", shortResult.pagination.current, 1);
  TestValidator.equals("limit is 20", shortResult.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    shortResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    shortResult.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.equals("has data array", Array.isArray(shortResult.data), true);
  // Test 2: Search with medium length query
  const mediumQuery = RandomGenerator.paragraph({ sentences: 3 });
  const mediumResult = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: mediumQuery,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(mediumResult);
  // Validate pagination metadata for medium query
  TestValidator.equals(
    "medium query current page",
    mediumResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "medium query limit is 10",
    mediumResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "medium query records >= 0",
    mediumResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "medium query pages >= 0",
    mediumResult.pagination.pages >= 0,
  );
  // Test 3: Search with long query string
  const longQuery = RandomGenerator.content({ paragraphs: 2 });
  const longResult = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: longQuery,
        page: 1,
        limit: 50,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(longResult);
  // Validate pagination metadata for long query
  TestValidator.equals(
    "long query current page",
    longResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "long query limit is 50",
    longResult.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "long query records >= 0",
    longResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "long query pages >= 0",
    longResult.pagination.pages >= 0,
  );
  // Test 4: Verify result structure - check for product type results
  const productResult = shortResult.data.find(
    (
      item,
    ): item is Extract<
      typeof item,
      {
        type: "product";
      }
    > => item.type === "product",
  );
  if (productResult) {
    // Verify product has required fields with business logic validation
    TestValidator.predicate(
      "product name is not empty",
      productResult.name.length > 0,
    );
    TestValidator.predicate(
      "thumbnailUrl starts with http",
      /^https?:\/\//.test(productResult.thumbnailUrl),
    );
    TestValidator.predicate(
      "basePrice is non-negative",
      productResult.basePrice >= 0,
    );
    // Verify seller information
    TestValidator.equals(
      "seller has id",
      productResult.seller.id !== undefined,
      true,
    );
    TestValidator.equals(
      "seller has shop name",
      productResult.seller.shop_name.length > 0,
      true,
    );
    // Verify category information
    TestValidator.equals(
      "category has id",
      productResult.category.id !== undefined,
      true,
    );
    TestValidator.equals(
      "category has name",
      productResult.category.name.length > 0,
      true,
    );
    // Verify optional fields
    TestValidator.equals(
      "reviewCount is non-negative",
      productResult.reviewCount >= 0,
      true,
    );
  }
  // Test 5: Verify category result structure (if categories exist in results)
  const categoryResult = shortResult.data.find(
    (
      item,
    ): item is Extract<
      typeof item,
      {
        type: "category";
      }
    > => item.type === "category",
  );
  if (categoryResult) {
    TestValidator.equals(
      "category name is not empty",
      categoryResult.name.length > 0,
      true,
    );
    TestValidator.equals(
      "productCount is non-negative",
      categoryResult.productCount >= 0,
      true,
    );
    TestValidator.equals(
      "hasSubcategories is boolean",
      typeof categoryResult.hasSubcategories === "boolean",
      true,
    );
  }
  // Test 6: Verify seller result structure (if sellers exist in results)
  const sellerResult = shortResult.data.find(
    (
      item,
    ): item is Extract<
      typeof item,
      {
        type: "seller";
      }
    > => item.type === "seller",
  );
  if (sellerResult) {
    TestValidator.equals(
      "seller shop name is not empty",
      sellerResult.shopName.length > 0,
      true,
    );
    TestValidator.equals(
      "productCount is non-negative",
      sellerResult.productCount >= 0,
      true,
    );
  }
  // Test 7: Test search with category filter
  const categoryFilterResult = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: shortQuery,
        page: 1,
        limit: 20,
        category_id: null,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(categoryFilterResult);
  TestValidator.equals(
    "category filter pagination exists",
    categoryFilterResult.pagination !== undefined,
    true,
  );
  // Test 8: Test search with price range filter
  const priceFilterResult = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: shortQuery,
        page: 1,
        limit: 20,
        min_price: 0,
        max_price: 1000000,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(priceFilterResult);
  TestValidator.equals(
    "price filter pagination exists",
    priceFilterResult.pagination !== undefined,
    true,
  );
  // Test 9: Test search with sort options
  const sortResult = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: shortQuery,
        page: 1,
        limit: 20,
        sort_by: "relevance",
        sort_order: "desc",
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(sortResult);
  TestValidator.equals(
    "sort pagination exists",
    sortResult.pagination !== undefined,
    true,
  );
}
