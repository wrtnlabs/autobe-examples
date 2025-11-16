import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test that child category retrieval supports text search filtering by category
 * name.
 *
 * This test validates the name-based search functionality for child categories
 * within a hierarchical category structure. It verifies that the search API
 * correctly filters categories based on name patterns, supports
 * case-insensitive matching, performs partial (substring) matching, and
 * properly handles no-match scenarios.
 *
 * Test Flow:
 *
 * 1. Authenticate as admin to gain category management privileges
 * 2. Create a parent category to establish hierarchical context
 * 3. Create multiple child categories with distinct, searchable names
 * 4. Test exact name match search
 * 5. Test partial name match (substring search)
 * 6. Test case-insensitive search
 * 7. Test no-match scenario (empty results)
 * 8. Validate pagination structure and response integrity
 */
export async function test_api_category_children_search_by_name(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create parent category
  const parentCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);

  // Step 3: Create child categories with distinct searchable names
  const electronicsChild =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: "Electronics Devices",
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(electronicsChild);

  const clothingChild =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: "Clothing Apparel",
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 2,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(clothingChild);

  const electronicsAccessoriesChild =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: "Electronics Accessories",
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 3,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(electronicsAccessoriesChild);

  // Step 4: Test exact name match search
  const exactMatchResult =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        search: "Electronics Devices",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(exactMatchResult);
  TestValidator.equals(
    "exact match should return exactly one category",
    exactMatchResult.data.length,
    1,
  );
  TestValidator.equals(
    "exact match should return the correct category",
    exactMatchResult.data[0].id,
    electronicsChild.id,
  );

  // Step 5: Test partial match (substring search)
  const partialMatchResult =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        search: "Electronics",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(partialMatchResult);
  TestValidator.equals(
    "partial match should return two categories containing 'Electronics'",
    partialMatchResult.data.length,
    2,
  );

  const foundElectronicsIds = partialMatchResult.data.map((c) => c.id).sort();
  const expectedElectronicsIds = [
    electronicsChild.id,
    electronicsAccessoriesChild.id,
  ].sort();
  TestValidator.equals(
    "partial match should return both Electronics categories",
    foundElectronicsIds,
    expectedElectronicsIds,
  );

  // Step 6: Test case-insensitive search
  const caseInsensitiveResult =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        search: "electronics",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(caseInsensitiveResult);
  TestValidator.equals(
    "case-insensitive search should return same results as case-sensitive",
    caseInsensitiveResult.data.length,
    2,
  );

  const foundCaseInsensitiveIds = caseInsensitiveResult.data
    .map((c) => c.id)
    .sort();
  TestValidator.equals(
    "case-insensitive search should return both Electronics categories",
    foundCaseInsensitiveIds,
    expectedElectronicsIds,
  );

  // Step 7: Test no-match scenario
  const noMatchResult =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        search: "NonExistentCategory",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(noMatchResult);
  TestValidator.equals(
    "search with no matches should return empty array",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no-match search should have zero total records",
    noMatchResult.pagination.records,
    0,
  );

  // Step 8: Validate all children without search filter
  const allChildrenResult =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: parentCategory.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(allChildrenResult);
  TestValidator.equals(
    "without search filter should return all three children",
    allChildrenResult.data.length,
    3,
  );
  TestValidator.equals(
    "pagination should show correct total records",
    allChildrenResult.pagination.records,
    3,
  );
}
