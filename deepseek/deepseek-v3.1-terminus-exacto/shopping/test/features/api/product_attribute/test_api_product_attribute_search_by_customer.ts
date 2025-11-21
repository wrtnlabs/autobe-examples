import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttribute";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test comprehensive product attribute search functionality accessible to
 * customers without authentication. Validates that customers can search and
 * filter product attributes using various criteria including text search,
 * pagination, and sorting options. The scenario ensures proper attribute
 * discovery for product comparison and specification browsing.
 */
export async function test_api_product_attribute_search_by_customer(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection for customer access
  const customerConnection: api.IConnection = { ...connection, headers: {} };

  // Use a known product ID that exists in the system for testing
  // In a real scenario, this would be an existing product with attributes
  const testProductId = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Basic search without parameters
  const basicSearch =
    await api.functional.shoppingMall.products.attributes.index(
      customerConnection,
      {
        productId: testProductId,
        body: {} satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.equals(
    "pagination should exist",
    typeof basicSearch.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination should have valid structure",
    basicSearch.pagination.current >= 0 && basicSearch.pagination.limit > 0,
  );

  // Test 2: Search with pagination parameters
  const paginatedSearch =
    await api.functional.shoppingMall.products.attributes.index(
      customerConnection,
      {
        productId: testProductId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "page should be 1",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10",
    paginatedSearch.pagination.limit,
    10,
  );

  // Test 3: Search with text pattern matching
  const patternSearch =
    await api.functional.shoppingMall.products.attributes.index(
      customerConnection,
      {
        productId: testProductId,
        body: {
          search: "color",
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(patternSearch);

  // Test 4: Search with sorting by attribute_name ascending
  const sortedByNameAsc =
    await api.functional.shoppingMall.products.attributes.index(
      customerConnection,
      {
        productId: testProductId,
        body: {
          sort_by: "attribute_name",
          order: "asc",
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(sortedByNameAsc);

  // Test 5: Search with sorting by attribute_name descending
  const sortedByNameDesc =
    await api.functional.shoppingMall.products.attributes.index(
      customerConnection,
      {
        productId: testProductId,
        body: {
          sort_by: "attribute_name",
          order: "desc",
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(sortedByNameDesc);

  // Test 6: Search with sorting by display_order
  const sortedByOrder =
    await api.functional.shoppingMall.products.attributes.index(
      customerConnection,
      {
        productId: testProductId,
        body: {
          sort_by: "display_order",
          order: "asc",
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(sortedByOrder);

  // Test 7: Search with sorting by created_at
  const sortedByDate =
    await api.functional.shoppingMall.products.attributes.index(
      customerConnection,
      {
        productId: testProductId,
        body: {
          sort_by: "created_at",
          order: "desc",
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(sortedByDate);

  // Test 8: Search with combined parameters
  const combinedSearch =
    await api.functional.shoppingMall.products.attributes.index(
      customerConnection,
      {
        productId: testProductId,
        body: {
          page: 2,
          limit: 5,
          search: "size",
          sort_by: "attribute_value",
          order: "asc",
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "page should be 2",
    combinedSearch.pagination.current,
    2,
  );
  TestValidator.equals("limit should be 5", combinedSearch.pagination.limit, 5);

  // Validate that all search operations complete successfully
  TestValidator.predicate(
    "all search operations should return valid responses",
    basicSearch.data !== undefined &&
      paginatedSearch.data !== undefined &&
      patternSearch.data !== undefined,
  );

  // Test error handling with invalid product ID
  await TestValidator.error("should fail with invalid product ID", async () => {
    await api.functional.shoppingMall.products.attributes.index(
      customerConnection,
      {
        productId: "invalid-uuid",
        body: {} satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  });
}
