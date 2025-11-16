import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test creating a subcategory under an existing parent category.
 *
 * This test validates that administrators can build hierarchical category
 * structures by creating child categories. The test authenticates as admin,
 * creates a root-level parent category first, then creates a second category
 * with parent_id set to the first category's UUID. It verifies that the
 * subcategory is created with correct parent_id reference, establishing the
 * parent-child relationship and validating that the category hierarchy is
 * correctly represented for multi-level taxonomy trees.
 *
 * Steps:
 *
 * 1. Authenticate as admin user
 * 2. Create root-level parent category
 * 3. Create subcategory with parent_id referencing the parent
 * 4. Verify subcategory creation and parent relationship
 */
export async function test_api_category_creation_subcategory(
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

  // Step 2: Create root-level parent category
  const parentCategoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: RandomGenerator.pick(["active", "inactive"] as const),
  } satisfies IShoppingMallCategory.ICreate;

  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: parentCategoryData,
    });
  typia.assert(parentCategory);

  // Verify parent category was created without parent_id (root-level)
  TestValidator.equals(
    "parent category should be root level",
    parentCategory.parent_id,
    null,
  );
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

  // Step 3: Create subcategory with parent_id
  const subcategoryData = {
    parent_id: parentCategory.id,
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: RandomGenerator.pick(["active", "inactive"] as const),
  } satisfies IShoppingMallCategory.ICreate;

  const subcategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: subcategoryData,
    });
  typia.assert(subcategory);

  // Step 4: Verify subcategory creation and parent relationship
  TestValidator.equals(
    "subcategory parent_id matches parent category id",
    subcategory.parent_id,
    parentCategory.id,
  );
  TestValidator.equals(
    "subcategory name matches",
    subcategory.name,
    subcategoryData.name,
  );
  TestValidator.equals(
    "subcategory slug matches",
    subcategory.slug,
    subcategoryData.slug,
  );
  TestValidator.predicate(
    "subcategory has valid UUID",
    typia.is<string & tags.Format<"uuid">>(subcategory.id),
  );
  TestValidator.predicate(
    "parent-child relationship established",
    subcategory.parent_id === parentCategory.id,
  );
}
