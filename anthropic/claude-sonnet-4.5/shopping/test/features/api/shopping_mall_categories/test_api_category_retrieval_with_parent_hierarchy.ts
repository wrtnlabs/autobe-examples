import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test retrieving a category with parent-child hierarchical relationships.
 *
 * This test validates that category hierarchy information is correctly exposed
 * through the retrieval API. It creates a parent category first, then creates a
 * child category referencing the parent, and retrieves the child category to
 * verify that parent relationship information is properly included in the
 * response.
 *
 * Steps:
 *
 * 1. Authenticate as admin to gain category creation privileges
 * 2. Create a parent category at root level
 * 3. Create a child category with parent reference
 * 4. Retrieve the child category by categoryCode
 * 5. Validate parent relationship is correctly populated
 * 6. Verify parent summary information matches the created parent
 */
export async function test_api_category_retrieval_with_parent_hierarchy(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
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

  // Step 2: Create parent category at root level
  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);

  // Step 3: Create child category with parent reference
  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory);

  // Step 4: Retrieve the child category by categoryCode
  const retrievedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.categories.getByCategorycode(connection, {
      categoryCode: childCategory.slug,
    });
  typia.assert(retrievedCategory);

  // Step 5: Validate parent relationship is correctly populated
  TestValidator.equals(
    "retrieved category ID matches",
    retrievedCategory.id,
    childCategory.id,
  );
  TestValidator.equals(
    "parent ID is correctly set",
    retrievedCategory.parent_id,
    parentCategory.id,
  );

  // Step 6: Verify parent summary information
  typia.assertGuard(retrievedCategory.parent!);
  TestValidator.equals(
    "parent summary ID matches",
    retrievedCategory.parent.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent summary name matches",
    retrievedCategory.parent.name,
    parentCategory.name,
  );
  TestValidator.equals(
    "parent summary slug matches",
    retrievedCategory.parent.slug,
    parentCategory.slug,
  );
}
