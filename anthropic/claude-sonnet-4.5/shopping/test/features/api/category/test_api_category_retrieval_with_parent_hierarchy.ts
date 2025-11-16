import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test retrieving a nested child category by slug to validate hierarchical
 * category relationships.
 *
 * This test validates that the category hierarchy structure is properly
 * maintained by creating a parent-child category relationship and verifying
 * that parent information is correctly included when retrieving the child
 * category. This ensures breadcrumb navigation and category tree rendering work
 * correctly.
 *
 * Steps:
 *
 * 1. Authenticate as admin to gain category management permissions
 * 2. Create a parent category with active status
 * 3. Create a child category referencing the parent
 * 4. Retrieve the child category by slug
 * 5. Validate parent relationship data is properly populated
 */
export async function test_api_category_retrieval_with_parent_hierarchy(
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
        parent_id: null,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);

  // Step 3: Create child category with parent reference
  const childCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory);

  // Step 4: Retrieve child category by slug
  const retrievedCategory =
    await api.functional.shoppingMall.categories.getByCategoryslug(connection, {
      categorySlug: childCategory.slug,
    });
  typia.assert(retrievedCategory);

  // Step 5: Validate parent relationship is properly populated
  TestValidator.equals(
    "retrieved category ID matches created child category",
    retrievedCategory.id,
    childCategory.id,
  );

  TestValidator.equals(
    "parent_id is correctly populated",
    retrievedCategory.parent_id,
    parentCategory.id,
  );

  // Validate parent summary object exists and contains essential details
  typia.assertGuard(retrievedCategory.parent!);

  TestValidator.equals(
    "parent summary ID matches parent category",
    retrievedCategory.parent.id,
    parentCategory.id,
  );

  TestValidator.equals(
    "parent summary name matches parent category",
    retrievedCategory.parent.name,
    parentCategory.name,
  );

  TestValidator.equals(
    "parent summary slug matches parent category",
    retrievedCategory.parent.slug,
    parentCategory.slug,
  );
}
