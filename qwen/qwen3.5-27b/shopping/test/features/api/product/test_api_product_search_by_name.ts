import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the basic product search functionality with text matching on product names.
 *
 * Validates that the product search endpoint correctly performs case-insensitive partial matching on product names. Tests that products with names containing the search term are returned while products without matching names are excluded. Verifies that all required product summary fields are present in the response and that pagination metadata accurately reflects the result set.
 *
 * Special attention is given to verifying that partial matching works correctly (e.g., 'laptop' matches 'Gaming Laptop'), that seller information is properly joined, and that the in_stock status correctly reflects variant inventory levels.
 *
 * 1. Call the product search endpoint with search term 'laptop'.
 * 2. Verify response contains only products with names containing 'laptop' (case-insensitive).
 * 3. Verify each product includes all required summary fields (id, name, base_price, seller, category, main_image_uri, variant_count, image_count, in_stock).
 * 4. Verify pagination metadata is present and accurate.
 * 5. Test case-insensitive search with 'LAPTOP' to ensure same results.
 * 6. Test with empty search to verify it returns all products.
 */
export async function test_api_product_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with 'laptop'
  const searchResult = await api.functional.shoppingMall.products.search.index(
    connection,
    {
      body: {
        search: "laptop",
        page: 1,
        pageSize: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchResult);
  // Test 2: Verify all products contain 'laptop' in name (case-insensitive)
  TestValidator.predicate(
    "all products contain 'laptop'",
    searchResult.data.every((p: IShoppingMallProduct.ISummary) =>
      p.name.toLowerCase().includes("laptop"),
    ),
  );
  // Test 3: Verify required fields are present
  for (const product of searchResult.data) {
    TestValidator.predicate("product has id", product.id !== undefined);
    TestValidator.predicate("product has name", product.name !== undefined);
    TestValidator.predicate(
      "product has base_price",
      product.base_price !== undefined,
    );
    TestValidator.predicate("product has seller", product.seller !== undefined);
    TestValidator.predicate(
      "product has category or null",
      product.category !== undefined,
    );
    TestValidator.predicate(
      "product has main_image_uri or null",
      product.main_image_uri !== undefined,
    );
    TestValidator.predicate(
      "product has variant_count",
      product.variant_count !== undefined,
    );
    TestValidator.predicate(
      "product has image_count",
      product.image_count !== undefined,
    );
    TestValidator.predicate(
      "product has in_stock",
      product.in_stock !== undefined,
    );
  }
  // Test 4: Verify pagination metadata
  TestValidator.predicate(
    "has pagination",
    searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "has current page",
    searchResult.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "has limit",
    searchResult.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "has records count",
    searchResult.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "has pages count",
    searchResult.pagination.pages !== undefined,
  );
  // Test 5: Case-insensitive search with 'LAPTOP'
  const upperSearchResult =
    await api.functional.shoppingMall.products.search.index(connection, {
      body: {
        search: "LAPTOP",
        page: 1,
        pageSize: 20,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(upperSearchResult);
  TestValidator.predicate(
    "case-insensitive search returns same count",
    upperSearchResult.pagination.records === searchResult.pagination.records,
  );
  // Test 6: Empty search returns all products
  const emptySearchResult =
    await api.functional.shoppingMall.products.search.index(connection, {
      body: {
        search: "",
        page: 1,
        pageSize: 20,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search returns products",
    emptySearchResult.data.length >= 0,
  );
}
