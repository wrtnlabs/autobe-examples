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
 * Test that child categories can be retrieved publicly without authentication
 * for a given parent category.
 *
 * This test validates the hierarchical category navigation functionality that
 * buyers use to browse the marketplace, ensuring category trees can be explored
 * without requiring authentication.
 *
 * Test workflow:
 *
 * 1. Admin creates a parent category in the shopping mall
 * 2. Admin creates multiple child categories under the parent category
 * 3. A public (unauthenticated) request retrieves the list of child categories
 * 4. Validates that all child categories are returned with proper pagination
 *    metadata
 * 5. Verifies child categories contain essential information (id, name, slug,
 *    status, display_order, timestamps)
 * 6. Confirms categories are properly ordered according to display_order
 */
export async function test_api_category_children_retrieval_public(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to create test categories
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        full_name: "Test Admin",
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: "https://test-admin.example.com/join",
        referrer: "https://test-admin.example.com",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create parent category
  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and accessories",
        image_url: "https://example.com/images/electronics.jpg",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);

  // Step 3: Create multiple child categories under the parent
  const childCategory1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: "Smartphones",
        slug: "smartphones",
        description: "Mobile phones and smartphones",
        image_url: "https://example.com/images/smartphones.jpg",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory1);

  const childCategory2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: "Laptops",
        slug: "laptops",
        description: "Laptop computers and accessories",
        image_url: "https://example.com/images/laptops.jpg",
        display_order: 2,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory2);

  const childCategory3: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: "Tablets",
        slug: "tablets",
        description: "Tablet devices and accessories",
        image_url: "https://example.com/images/tablets.jpg",
        display_order: 3,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory3);

  // Step 4: Create unauthenticated connection for public access
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 5: Retrieve child categories publicly without authentication
  const childrenResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.children.index(
      unauthConnection,
      {
        categoryId: parentCategory.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "display_order",
          sort_direction: "asc",
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
  typia.assert(childrenResult);

  // Step 6: Validate pagination metadata
  TestValidator.equals(
    "pagination page should be 1",
    childrenResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    childrenResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be 3",
    childrenResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "total pages should be 1",
    childrenResult.pagination.pages,
    1,
  );

  // Step 7: Validate that all child categories are returned
  TestValidator.equals(
    "should return 3 child categories",
    childrenResult.data.length,
    3,
  );

  // Step 8: Validate child categories are properly ordered by display_order
  TestValidator.equals(
    "first category should be Smartphones",
    childrenResult.data[0].name,
    "Smartphones",
  );
  TestValidator.equals(
    "second category should be Laptops",
    childrenResult.data[1].name,
    "Laptops",
  );
  TestValidator.equals(
    "third category should be Tablets",
    childrenResult.data[2].name,
    "Tablets",
  );

  // Step 9: Validate parent_id relationship for all child categories
  for (const category of childrenResult.data) {
    TestValidator.equals(
      "category parent_id matches",
      category.parent_id,
      parentCategory.id,
    );
  }

  // Step 10: Validate categories are ordered by display_order ascending
  TestValidator.equals(
    "first category display_order",
    childrenResult.data[0].display_order,
    1,
  );
  TestValidator.equals(
    "second category display_order",
    childrenResult.data[1].display_order,
    2,
  );
  TestValidator.equals(
    "third category display_order",
    childrenResult.data[2].display_order,
    3,
  );
}
