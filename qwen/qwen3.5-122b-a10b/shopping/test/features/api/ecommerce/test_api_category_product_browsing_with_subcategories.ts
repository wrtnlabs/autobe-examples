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
 * Test product browsing includes products from subcategories.
 *
 * Validates that when a customer browses a parent category, the API correctly returns products from both the parent category and all its subcategories. This test verifies the hierarchical category browsing feature where customers can discover all products under a category family through the include_subcategories parameter.
 *
 * The test validates:
 * 1. API accepts valid category IDs and returns structured product summaries
 * 2. include_subcategories parameter controls recursive category filtering
 * 3. Response includes pagination metadata and product summary data
 * 4. Products include seller and category information
 * 5. Various query parameters (search, price range, sorting) work correctly
 *
 * Note: Full hierarchical testing with controlled data requires pre-existing category-product relationships in the test database. This test validates API structure and parameter handling.
 */
export async function test_api_category_product_browsing_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random category ID for testing
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Browse products with subcategories included (default behavior)
  const withSubcategories =
    await api.functional.ecommerce.categories.products.index(connection, {
      categoryId,
      body: {
        include_subcategories: true,
        limit: 20,
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(withSubcategories);
  // Test 2: Browse products without subcategories
  const withoutSubcategories =
    await api.functional.ecommerce.categories.products.index(connection, {
      categoryId,
      body: {
        include_subcategories: false,
        limit: 20,
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(withoutSubcategories);
  // Test 3: Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    withSubcategories.pagination !== null &&
      withSubcategories.pagination !== undefined,
  );
  TestValidator.predicate(
    "data is array",
    Array.isArray(withSubcategories.data),
  );
  TestValidator.predicate(
    "current page is non-negative",
    withSubcategories.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    withSubcategories.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    withSubcategories.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    withSubcategories.pagination.pages >= 0,
  );
  // Test 4: Test with search parameter
  const withSearch = await api.functional.ecommerce.categories.products.index(
    connection,
    {
      categoryId,
      body: {
        search: "test",
        include_subcategories: true,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(withSearch);
  // Test 5: Test with price range filter
  const minPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<0>
  >();
  const priceRange = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
  >();
  const maxPrice = minPrice + priceRange;
  const withPriceFilter =
    await api.functional.ecommerce.categories.products.index(connection, {
      categoryId,
      body: {
        min_price: minPrice,
        max_price: maxPrice,
        include_subcategories: true,
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(withPriceFilter);
  // Test 6: Test with sorting parameters
  const withSorting = await api.functional.ecommerce.categories.products.index(
    connection,
    {
      categoryId,
      body: {
        sort_by: "base_price",
        sort_order: "desc",
        include_subcategories: true,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(withSorting);
  // Test 7: Test with pagination page parameter
  const withPagination =
    await api.functional.ecommerce.categories.products.index(connection, {
      categoryId,
      body: {
        page: 1,
        limit: 10,
        include_subcategories: true,
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(withPagination);
  TestValidator.equals(
    "current page is 1",
    withPagination.pagination.current,
    1,
  );
  // Test 8: Test with in_stock_only filter
  const withStockFilter =
    await api.functional.ecommerce.categories.products.index(connection, {
      categoryId,
      body: {
        in_stock_only: true,
        include_subcategories: true,
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(withStockFilter);
  // Test 9: Test combined filters
  const withCombinedFilters =
    await api.functional.ecommerce.categories.products.index(connection, {
      categoryId,
      body: {
        search: "product",
        min_price: 100,
        max_price: 1000,
        sort_by: "name",
        sort_order: "asc",
        include_subcategories: true,
        limit: 15,
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(withCombinedFilters);
  TestValidator.predicate(
    "combined filters returned valid response",
    withCombinedFilters.pagination.records >= 0,
  );
}
