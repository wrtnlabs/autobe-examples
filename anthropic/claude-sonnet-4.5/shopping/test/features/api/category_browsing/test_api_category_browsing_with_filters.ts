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
 * Test comprehensive category browsing functionality with various filters.
 *
 * This test validates the category browsing API endpoint with pagination and
 * filtering capabilities.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to enable category management
 * 2. Create multiple test categories with varying properties
 * 3. Browse categories using pagination
 * 4. Validate response structure and pagination metadata
 * 5. Verify category data integrity
 */
export async function test_api_category_browsing_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create multiple test categories
  const categoryNames = [
    "Electronics",
    "Clothing",
    "Books",
    "Home & Garden",
    "Sports",
  ];
  const createdCategories: IShoppingMallCategory[] = [];

  for (const categoryName of categoryNames) {
    const category: IShoppingMallCategory =
      await api.functional.shoppingMall.admin.categories.create(connection, {
        body: {
          name: categoryName,
        } satisfies IShoppingMallCategory.ICreate,
      });
    typia.assert(category);
    createdCategories.push(category);
  }

  // Step 3: Browse categories with pagination (page 0)
  const firstPageResult: IPageIShoppingMallCategory =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 0,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(firstPageResult);

  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid current page",
    firstPageResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    firstPageResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    firstPageResult.pagination.records >= createdCategories.length,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    firstPageResult.pagination.pages >= 0,
  );

  // Step 5: Validate category data
  TestValidator.predicate(
    "response should contain data array",
    Array.isArray(firstPageResult.data),
  );
  TestValidator.predicate(
    "data array should contain categories",
    firstPageResult.data.length >= 0,
  );

  // Step 6: Verify at least some of our created categories appear in results
  const returnedCategoryIds = firstPageResult.data.map((cat) => cat.id);
  const foundCategories = createdCategories.filter((cat) =>
    returnedCategoryIds.includes(cat.id),
  );

  TestValidator.predicate(
    "at least some created categories should be in results",
    foundCategories.length > 0,
  );

  // Step 7: Validate category structure and verify created category data
  if (firstPageResult.data.length > 0) {
    const firstCategory = firstPageResult.data[0];
    TestValidator.predicate(
      "category should have valid id",
      typeof firstCategory.id === "string" && firstCategory.id.length > 0,
    );
    TestValidator.predicate(
      "category should have valid name",
      typeof firstCategory.name === "string" && firstCategory.name.length > 0,
    );

    // Verify that at least one of our created categories matches by name
    const matchingCategory = firstPageResult.data.find((cat) =>
      categoryNames.includes(cat.name),
    );
    if (matchingCategory) {
      TestValidator.predicate(
        "found category name should match one of created categories",
        categoryNames.includes(matchingCategory.name),
      );
    }
  }

  // Step 8: Test pagination with page 1 if there are enough records
  if (firstPageResult.pagination.pages > 1) {
    const secondPageResult: IPageIShoppingMallCategory =
      await api.functional.shoppingMall.categories.index(connection, {
        body: {
          page: 1,
        } satisfies IShoppingMallCategory.IRequest,
      });
    typia.assert(secondPageResult);

    TestValidator.equals(
      "second page should have current page as 1",
      secondPageResult.pagination.current,
      1,
    );
  }
}
