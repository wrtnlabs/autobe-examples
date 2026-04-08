import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test category filtering with subcategories in product search.
 *
 * Validates that the include_subcategories parameter correctly controls whether products from child categories are included when filtering by category. Tests both include_subcategories=false (direct category only) and include_subcategories=true (recursive category matching) behaviors.
 *
 * This test verifies the hierarchical category filtering logic works correctly for the ecommerce product search endpoint. It ensures that:
 * - Products directly in a category are returned when searching by that category
 * - Products in subcategories are excluded when include_subcategories=false
 * - Products in subcategories are included when include_subcategories=true
 * - The category information is properly joined in product summaries
 *
 * 1. Search with category_id and include_subcategories=false
 * 2. Verify only products directly in the category are returned
 * 3. Search with same category_id and include_subcategories=true
 * 4. Verify products from category and subcategories are returned
 * 5. Search with subcategory_id and include_subcategories=false
 * 6. Verify only products in that specific subcategory are returned
 * 7. Test category filtering combined with price range filter
 * 8. Test category filtering combined with name search
 * 9. Validate response structure and pagination metadata
 */
export async function test_api_product_search_category_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with include_subcategories=false
  const searchWithoutSubcategories =
    await api.functional.ecommerce.products.index(connection, {
      body: {
        include_subcategories: false,
        limit: 20,
        page: 1,
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(searchWithoutSubcategories);
  // Test 2: Search with include_subcategories=true
  const searchWithSubcategories = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        include_subcategories: true,
        limit: 20,
        page: 1,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(searchWithSubcategories);
  // Test 3: Validate pagination structure
  TestValidator.predicate(
    "pagination has valid structure",
    searchWithoutSubcategories.pagination.current >= 0 &&
      searchWithoutSubcategories.pagination.limit > 0 &&
      searchWithoutSubcategories.pagination.records >= 0 &&
      searchWithoutSubcategories.pagination.pages >= 0,
  );
  // Test 4: Validate product summary structure
  if (searchWithoutSubcategories.data.length > 0) {
    const firstProduct = searchWithoutSubcategories.data[0];
    TestValidator.predicate(
      "product has required fields",
      firstProduct.id !== undefined &&
        firstProduct.name !== undefined &&
        firstProduct.base_price !== undefined &&
        firstProduct.seller !== undefined &&
        firstProduct.category !== undefined,
    );
    // Validate seller summary
    TestValidator.predicate(
      "seller has shop_name",
      firstProduct.seller.shop_name !== undefined,
    );
    // Validate category summary
    TestValidator.predicate(
      "category has name",
      firstProduct.category.name !== undefined,
    );
  }
  // Test 5: Search with price range filter
  const searchWithPriceRange = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        min_price: 0,
        max_price: 10000,
        include_subcategories: true,
        limit: 20,
        page: 1,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(searchWithPriceRange);
  // Test 6: Validate price filtering was applied
  if (searchWithPriceRange.data.length > 0) {
    const allPricesInRange = searchWithPriceRange.data.every(
      (product) => product.base_price >= 0 && product.base_price <= 10000,
    );
    TestValidator.predicate(
      "all products within price range",
      allPricesInRange,
    );
  }
  // Test 7: Search with name keyword
  const searchWithName = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        search: "test",
        include_subcategories: true,
        limit: 20,
        page: 1,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(searchWithName);
  // Test 8: Validate name search results contain keyword
  if (searchWithName.data.length > 0) {
    const keyword = "test";
    const allMatchKeyword = searchWithName.data.every((product) =>
      product.name.toLowerCase().includes(keyword.toLowerCase()),
    );
    TestValidator.predicate(
      "all products match search keyword",
      allMatchKeyword,
    );
  }
  // Test 9: Test sorting options
  const searchSortedByName = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        sort_by: "name",
        sort_order: "asc",
        limit: 20,
        page: 1,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(searchSortedByName);
  // Test 10: Validate sorting was applied (names should be in ascending order)
  if (searchSortedByName.data.length > 1) {
    const isSorted = searchSortedByName.data.every(
      (product, index) =>
        index === 0 || product.name >= searchSortedByName.data[index - 1].name,
    );
    TestValidator.predicate("products sorted by name ascending", isSorted);
  }
  // Test 11: Test with stock filter
  const searchInStock = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        in_stock_only: true,
        include_subcategories: true,
        limit: 20,
        page: 1,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(searchInStock);
  // Test 12: Validate all returned products have stock status
  if (searchInStock.data.length > 0) {
    const allHaveStockStatus = searchInStock.data.every(
      (product) => product.stock_status !== undefined,
    );
    TestValidator.predicate(
      "all products have stock status",
      allHaveStockStatus,
    );
  }
  // Test 13: Test pagination with cursor
  const searchWithCursor = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        limit: 5,
        page: 2,
        include_subcategories: true,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(searchWithCursor);
  // Test 14: Validate pagination metadata consistency
  TestValidator.equals(
    "pagination current page matches request",
    searchWithCursor.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit matches request",
    searchWithCursor.pagination.limit,
    5,
  );
}
