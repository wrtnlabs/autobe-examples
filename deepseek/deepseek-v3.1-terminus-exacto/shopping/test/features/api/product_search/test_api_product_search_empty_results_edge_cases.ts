import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_categories_create } from "../../../generate/generate_random_ecommerce_administrator_categories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";

/**
 * Test edge case scenarios that should return empty results from product search.
 * Scenarios include: nonexistent product names, empty categories, restrictive
 * price ranges, combined filters, and pagination beyond available records.
 */
export async function test_api_product_search_empty_results_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Set up administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!" satisfies string & tags.Format<"password">,
    },
  });
  typia.assert(adminAuth);
  // Step 2: Create test categories for filtering
  const categories = await ArrayUtil.asyncRepeat(3, async () => {
    const category =
      await generate_random_ecommerce_administrator_categories_create(
        adminConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(category);
    return category;
  });
  // Step 3: Test Scenario A - Non-existent product name
  console.log("Testing Scenario A: Non-existent product name");
  const nonexistentSearch = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        search: "ThisProductNameDefinitelyDoesNotExist123456789",
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(nonexistentSearch);
  TestValidator.equals(
    "empty results for non-existent search",
    nonexistentSearch.data,
    [],
  );
  TestValidator.equals("zero records", nonexistentSearch.pagination.records, 0);
  TestValidator.equals("zero pages", nonexistentSearch.pagination.pages, 0);
  TestValidator.predicate(
    "valid current page",
    nonexistentSearch.pagination.current === 1,
  );
  TestValidator.predicate(
    "valid limit",
    nonexistentSearch.pagination.limit === 10,
  );
  // Step 4: Test Scenario B - Category with no products
  console.log("Testing Scenario B: Category with no products");
  const emptyCategory = categories[0];
  const emptyCategorySearch = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        category_id: emptyCategory.id satisfies string & tags.Format<"uuid">,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 20 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(emptyCategorySearch);
  TestValidator.equals(
    "empty results for empty category",
    emptyCategorySearch.data,
    [],
  );
  TestValidator.equals(
    "zero records for empty category",
    emptyCategorySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for empty category",
    emptyCategorySearch.pagination.pages,
    0,
  );
  // Step 5: Test Scenario C - Restrictive price range
  console.log("Testing Scenario C: Restrictive price range");
  const highPriceSearch = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        price_min: 1000000 satisfies number & tags.Minimum<0>,
        price_max: 2000000 satisfies number & tags.Minimum<0>,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(highPriceSearch);
  TestValidator.equals(
    "empty results for restrictive price range",
    highPriceSearch.data,
    [],
  );
  TestValidator.equals(
    "zero records for price range",
    highPriceSearch.pagination.records,
    0,
  );
  // Test with price_min > price_max (should return empty results)
  const invertedPriceSearch = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        price_min: 500 satisfies number & tags.Minimum<0>,
        price_max: 100 satisfies number & tags.Minimum<0>,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(invertedPriceSearch);
  TestValidator.equals(
    "empty results for inverted price range",
    invertedPriceSearch.data,
    [],
  );
  // Step 6: Test Scenario D - Multiple restrictive filters
  console.log("Testing Scenario D: Multiple restrictive filters");
  const combinedFilterSearch = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        search: "PremiumLuxuryExclusiveProduct",
        category_id: categories[1].id satisfies string & tags.Format<"uuid">,
        price_min: 1000 satisfies number & tags.Minimum<0>,
        price_max: 1500 satisfies number & tags.Minimum<0>,
        in_stock: true,
        sort_by: "price_low",
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 15 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(combinedFilterSearch);
  TestValidator.equals(
    "empty results with combined filters",
    combinedFilterSearch.data,
    [],
  );
  TestValidator.equals(
    "zero records with combined filters",
    combinedFilterSearch.pagination.records,
    0,
  );
  // Step 7: Test Scenario E - Pagination beyond available records
  console.log("Testing Scenario E: Pagination beyond available records");
  const highPageSearch = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        search: "SomeRandomText",
        page: 100 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(highPageSearch);
  TestValidator.equals(
    "empty results for high page number",
    highPageSearch.data,
    [],
  );
  TestValidator.equals(
    "current page should be 100",
    highPageSearch.pagination.current,
    100,
  );
  TestValidator.equals(
    "zero records for high page search",
    highPageSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for high page search",
    highPageSearch.pagination.pages,
    0,
  );
  // Step 8: Test Scenario F - Filter for in_stock only with no products
  console.log("Testing Scenario F: In-stock filter with no products");
  const inStockOnlySearch = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        in_stock: true,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(inStockOnlySearch);
  TestValidator.equals(
    "empty results for in-stock only",
    inStockOnlySearch.data,
    [],
  );
  console.log("All empty result edge case tests passed!");
}
