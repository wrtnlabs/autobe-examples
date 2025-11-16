import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test the creation of nested subcategories within an existing category
 * hierarchy.
 *
 * This test validates that administrators can build multi-level category trees
 * with unlimited nesting depth, ensuring proper parent-child relationships are
 * established at each level.
 *
 * Workflow steps:
 *
 * 1. Admin authenticates via join
 * 2. Admin creates parent category at root level
 * 3. Admin creates child category with parent_id referencing the root category
 * 4. Admin creates grandchild category with parent_id referencing the child
 *    category
 *
 * Validation points:
 *
 * - Verify parent category is created successfully as root-level category
 * - Confirm child category is created with valid parent_id reference
 * - Validate grandchild category establishes correct parent-child relationship
 * - Ensure hierarchical structure supports unlimited nesting depth
 */
export async function test_api_category_creation_nested_hierarchy(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates via join
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
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

  // Step 2: Admin creates parent category at root level
  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and accessories",
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);

  // Validate parent category is created as root-level category
  TestValidator.equals(
    "parent category has no parent",
    parentCategory.parent_id,
    null,
  );
  TestValidator.equals(
    "parent category name",
    parentCategory.name,
    "Electronics",
  );
  TestValidator.equals(
    "parent category slug",
    parentCategory.slug,
    "electronics",
  );
  TestValidator.equals(
    "parent category status",
    parentCategory.status,
    "active",
  );

  // Step 3: Admin creates child category with parent_id referencing the root category
  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: "Computers",
        slug: "computers",
        description: "Desktop and laptop computers",
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory);

  // Validate child category has valid parent_id reference
  TestValidator.equals(
    "child category parent_id matches parent",
    childCategory.parent_id,
    parentCategory.id,
  );
  TestValidator.equals("child category name", childCategory.name, "Computers");
  TestValidator.equals("child category slug", childCategory.slug, "computers");
  TestValidator.equals("child category status", childCategory.status, "active");

  // Step 4: Admin creates grandchild category with parent_id referencing the child category
  const grandchildCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: childCategory.id,
        name: "Laptops",
        slug: "laptops",
        description: "Portable laptop computers",
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(grandchildCategory);

  // Validate grandchild category establishes correct parent-child relationship
  TestValidator.equals(
    "grandchild category parent_id matches child",
    grandchildCategory.parent_id,
    childCategory.id,
  );
  TestValidator.equals(
    "grandchild category name",
    grandchildCategory.name,
    "Laptops",
  );
  TestValidator.equals(
    "grandchild category slug",
    grandchildCategory.slug,
    "laptops",
  );
  TestValidator.equals(
    "grandchild category status",
    grandchildCategory.status,
    "active",
  );

  // Validate hierarchical structure integrity
  TestValidator.predicate(
    "parent is root level",
    parentCategory.parent_id === null,
  );
  TestValidator.predicate(
    "child has parent reference",
    childCategory.parent_id === parentCategory.id,
  );
  TestValidator.predicate(
    "grandchild has child reference",
    grandchildCategory.parent_id === childCategory.id,
  );

  // Verify unique slugs across all hierarchy levels
  const slugs = [
    parentCategory.slug,
    childCategory.slug,
    grandchildCategory.slug,
  ];
  TestValidator.equals("all slugs are unique", new Set(slugs).size, 3);

  // Validate all categories are active
  TestValidator.equals("parent is active", parentCategory.status, "active");
  TestValidator.equals("child is active", childCategory.status, "active");
  TestValidator.equals(
    "grandchild is active",
    grandchildCategory.status,
    "active",
  );
}
