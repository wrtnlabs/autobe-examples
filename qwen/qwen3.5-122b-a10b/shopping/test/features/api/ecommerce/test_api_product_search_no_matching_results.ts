import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test product search endpoint with no matching results across various filter combinations.
 *
 * Validates that the product search API correctly handles empty result sets when search criteria match no products. The test verifies proper pagination metadata, response structure, and business rule enforcement for empty searches.
 *
 * Multiple edge cases are tested including unique search keywords, non-existent category filters, impossible price ranges, and stock availability filters that exclude all products. Each scenario confirms the API returns a successful 200 response with empty data array and correct pagination metadata.
 *
 * 1. Create and authenticate a customer account for search access
 * 2. Search with unique random keyword that matches no product names
 * 3. Search with non-existent category_id UUID
 * 4. Search with min_price exceeding all product prices
 * 5. Search with in_stock_only=true when no products have stock
 * 6. Verify each search returns empty data array with pagination records=0, pages=0
 * 7. Verify response structure maintains required fields even with empty data
 * 8. Confirm no errors thrown for empty result sets
 */
export async function test_api_product_search_no_matching_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Search with unique random keyword (no matching products)
  const uniqueKeyword = `z${RandomGenerator.alphabets(20)}z`;
  const searchByName = await api.functional.ecommerce.customer.search.index(
    customerConnection,
    {
      body: {
        search: uniqueKeyword,
        limit: 20,
        page: 1,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(searchByName);
  // Verify empty results with keyword search
  TestValidator.equals(
    "keyword search returns empty data",
    searchByName.data.length,
    0,
  );
  TestValidator.equals(
    "keyword search pagination current",
    searchByName.pagination.current,
    1,
  );
  TestValidator.equals(
    "keyword search pagination records",
    searchByName.pagination.records,
    0,
  );
  TestValidator.equals(
    "keyword search pagination pages",
    searchByName.pagination.pages,
    0,
  );
  // 3. Search with non-existent category_id
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const searchByCategory = await api.functional.ecommerce.customer.search.index(
    customerConnection,
    {
      body: {
        category_id: nonExistentCategoryId,
        limit: 20,
        page: 1,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(searchByCategory);
  // Verify empty results with category filter
  TestValidator.equals(
    "category search returns empty data",
    searchByCategory.data.length,
    0,
  );
  TestValidator.equals(
    "category search pagination records",
    searchByCategory.pagination.records,
    0,
  );
  // 4. Search with min_price exceeding all possible prices
  const highMinPrice = 999999999;
  const searchByPrice = await api.functional.ecommerce.customer.search.index(
    customerConnection,
    {
      body: {
        min_price: highMinPrice,
        limit: 20,
        page: 1,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(searchByPrice);
  // Verify empty results with price filter
  TestValidator.equals(
    "price search returns empty data",
    searchByPrice.data.length,
    0,
  );
  TestValidator.equals(
    "price search pagination records",
    searchByPrice.pagination.records,
    0,
  );
  // 5. Search with in_stock_only=true (may return empty if no products in stock)
  const searchByStock = await api.functional.ecommerce.customer.search.index(
    customerConnection,
    {
      body: {
        in_stock_only: true,
        limit: 20,
        page: 1,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(searchByStock);
  // Verify response structure is valid even if results exist
  TestValidator.predicate(
    "search response has pagination",
    searchByStock.pagination !== null,
  );
  TestValidator.predicate(
    "search response has data array",
    Array.isArray(searchByStock.data),
  );
  // 6. Test combined filters that guarantee no results
  const combinedSearch = await api.functional.ecommerce.customer.search.index(
    customerConnection,
    {
      body: {
        search: uniqueKeyword,
        category_id: nonExistentCategoryId,
        min_price: highMinPrice,
        in_stock_only: true,
        limit: 20,
        page: 1,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(combinedSearch);
  // Verify combined filters return empty
  TestValidator.equals(
    "combined search returns empty data",
    combinedSearch.data.length,
    0,
  );
  TestValidator.equals(
    "combined search pagination records",
    combinedSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined search pagination pages",
    combinedSearch.pagination.pages,
    0,
  );
  // 7. Verify response structure maintains type safety for empty data
  TestValidator.equals(
    "data is array type",
    Array.isArray(combinedSearch.data),
    true,
  );
  TestValidator.predicate(
    "pagination current is number",
    typeof combinedSearch.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof combinedSearch.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof combinedSearch.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof combinedSearch.pagination.pages === "number",
  );
}
