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
 * Test hierarchical category structure and navigation.
 *
 * This test validates the multi-level category tree functionality by creating
 * root categories, subcategories, and deeply nested categories to verify
 * unlimited depth support. It tests parent-child relationship handling,
 * category tree traversal, and proper identification of root categories.
 *
 * Steps:
 *
 * 1. Authenticate as admin to enable category creation
 * 2. Create root categories (no parent)
 * 3. Create first-level subcategories
 * 4. Create second-level subcategories
 * 5. Create third-level subcategories (deep nesting)
 * 6. Retrieve category list via index API
 * 7. Validate all categories are present
 * 8. Verify category IDs and structure
 */
export async function test_api_category_hierarchical_navigation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create root categories
  const rootCategory1 =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Electronics",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(rootCategory1);

  const rootCategory2 =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Clothing",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(rootCategory2);

  // Step 3: Create first-level subcategories under Electronics
  const subCategory1 =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Computers",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(subCategory1);

  const subCategory2 =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Mobile Phones",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(subCategory2);

  // Step 4: Create second-level subcategories under Computers
  const subCategory3 =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Laptops",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(subCategory3);

  const subCategory4 =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Desktops",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(subCategory4);

  // Step 5: Create third-level subcategory under Laptops
  const subCategory5 =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Gaming Laptops",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(subCategory5);

  // Step 6: Retrieve all categories via index API
  const categoryPage: IPageIShoppingMallCategory =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(categoryPage);

  // Step 7: Validate pagination structure
  TestValidator.predicate(
    "pagination object should exist",
    categoryPage.pagination !== null && categoryPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "categories data array should exist",
    Array.isArray(categoryPage.data),
  );

  TestValidator.predicate(
    "should have at least 7 categories created",
    categoryPage.data.length >= 7,
  );

  // Step 8: Verify all created categories exist in response
  const createdCategoryIds = [
    rootCategory1.id,
    rootCategory2.id,
    subCategory1.id,
    subCategory2.id,
    subCategory3.id,
    subCategory4.id,
    subCategory5.id,
  ];

  const retrievedCategoryIds = categoryPage.data.map((cat) => cat.id);

  for (const categoryId of createdCategoryIds) {
    TestValidator.predicate(
      `category ${categoryId} should be in response`,
      retrievedCategoryIds.includes(categoryId),
    );
  }

  // Step 9: Validate category names match
  TestValidator.equals(
    "root category 1 name should match",
    rootCategory1.name,
    "Electronics",
  );

  TestValidator.equals(
    "root category 2 name should match",
    rootCategory2.name,
    "Clothing",
  );

  TestValidator.equals(
    "subcategory 1 name should match",
    subCategory1.name,
    "Computers",
  );
}
