import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test creating a subcategory within an existing category hierarchy by
 * specifying a parent category.
 *
 * This test validates the complete hierarchical category creation workflow:
 *
 * 1. Admin authenticates successfully to obtain authorization tokens
 * 2. Admin creates a parent category at the root level (parent_id null)
 * 3. Admin creates a child category with parent_id referencing the previously
 *    created parent
 * 4. The system establishes the parent-child relationship correctly
 * 5. The child category is properly nested under the parent in the hierarchy
 * 6. Both parent and child categories can be retrieved and show their relationship
 * 7. The hierarchical structure supports multi-level nesting
 *
 * This ensures that the category system supports building complex hierarchical
 * taxonomies with unlimited nesting depth for organizing diverse product
 * ranges.
 */
export async function test_api_category_creation_with_parent(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication - create and authenticate admin user
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const authenticatedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(authenticatedAdmin);

  // Step 2: Create parent category at root level (no parent_id)
  const parentCategoryData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: parentCategoryData,
    });
  typia.assert(parentCategory);

  // Validate parent category was created correctly
  TestValidator.equals(
    "parent category name matches",
    parentCategory.name,
    parentCategoryData.name,
  );
  TestValidator.equals(
    "parent category slug matches",
    parentCategory.slug,
    parentCategoryData.slug,
  );
  TestValidator.equals(
    "parent category has no parent",
    parentCategory.parent_id,
    null,
  );

  // Step 3: Create child category with parent_id reference
  const childCategoryData = {
    parent_id: parentCategory.id,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: childCategoryData,
    });
  typia.assert(childCategory);

  // Step 4: Validate parent-child relationship is established correctly
  TestValidator.equals(
    "child category name matches",
    childCategory.name,
    childCategoryData.name,
  );
  TestValidator.equals(
    "child category slug matches",
    childCategory.slug,
    childCategoryData.slug,
  );
  TestValidator.equals(
    "child category parent_id references parent",
    childCategory.parent_id,
    parentCategory.id,
  );

  // Validate hierarchical structure
  TestValidator.predicate(
    "parent and child categories have different IDs",
    parentCategory.id !== childCategory.id,
  );

  // Validate both categories are active
  TestValidator.equals(
    "parent category is active",
    parentCategory.status,
    "active",
  );
  TestValidator.equals(
    "child category is active",
    childCategory.status,
    "active",
  );
}
