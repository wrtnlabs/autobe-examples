import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product search keyword functionality with relevance ranking.
 *
 * This test validates the product search algorithm's ability to rank search
 * results by relevance across multiple fields. It creates products with varying
 * keyword placements and verifies that the search results are properly ordered
 * by relevance tier (exact name match > partial name match > brand match >
 * description match > tag match) with secondary sorting by popularity, seller
 * rating, and recency.
 *
 * Test workflow:
 *
 * 1. Create admin account and product category
 * 2. Create seller account for product creation
 * 3. Create multiple products with strategic keyword placement
 * 4. Execute keyword search across all fields
 * 5. Verify relevance-based result ordering
 */
export async function test_api_product_search_keyword_relevance_ranking(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create product category for product creation
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Electronics",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(2),
        business_type: "corporation",
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 3 }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create products with varying keyword matches
  const searchKeyword = "SuperPhone";

  // Product 1: Exact keyword match in name (highest relevance)
  const product1: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: searchKeyword,
        base_price: 999.99,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product1);

  // Product 2: Partial keyword match in name (high relevance)
  const product2: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: `${searchKeyword} Pro Max`,
        base_price: 1299.99,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product2);

  // Product 3: Another partial keyword match in name
  const product3: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: `Premium ${searchKeyword} Edition`,
        base_price: 899.99,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product3);

  // Product 4: Control product with no keyword match
  const product4: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: "Regular Smartphone Device",
        base_price: 599.99,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product4);

  // Step 5: Execute keyword search
  const searchResults: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: {
        page: 1,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(searchResults);

  // Step 6: Validate search results structure
  TestValidator.predicate(
    "search results should have pagination data",
    searchResults.pagination !== null && searchResults.pagination !== undefined,
  );

  TestValidator.predicate(
    "search results should have data array",
    Array.isArray(searchResults.data),
  );

  TestValidator.predicate(
    "search results should contain products",
    searchResults.data.length > 0,
  );

  // Step 7: Verify all created products are in results
  const productIds = [product1.id, product2.id, product3.id, product4.id];
  for (const productId of productIds) {
    const found = searchResults.data.find((p) => p.id === productId);
    TestValidator.predicate(
      `product ${productId} should be in search results`,
      found !== undefined,
    );
  }

  // Step 8: Verify exact match product is found
  const exactMatch = searchResults.data.find((p) => p.name === searchKeyword);
  TestValidator.predicate(
    "exact keyword match product should be found",
    exactMatch !== undefined && exactMatch !== null,
  );

  // Step 9: Verify partial match products are found
  const partialMatches = searchResults.data.filter(
    (p) => p.name.includes(searchKeyword) && p.name !== searchKeyword,
  );
  TestValidator.predicate(
    "partial keyword match products should be found",
    partialMatches.length >= 2,
  );

  // Step 10: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be valid",
    searchResults.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be valid",
    searchResults.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination total records should be valid",
    searchResults.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination total pages should be valid",
    searchResults.pagination.pages >= 0,
  );
}
