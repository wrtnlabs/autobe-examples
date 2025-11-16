import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test creating a category with active status to make it immediately visible in
 * the marketplace.
 *
 * The workflow validates:
 *
 * 1. Admin authenticates to the system
 * 2. Admin creates a new category with status='active'
 * 3. Verify the created category has all required properties
 * 4. Verify the category status is 'active'
 * 5. Verify the category is immediately operational and visible
 *
 * This test ensures that admins can create categories that are instantly
 * available for product assignment and visible to buyers and sellers without
 * requiring additional activation steps.
 */
export async function test_api_category_creation_active_status(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates to the system
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Admin creates a new category with status='active'
  const categoryName = RandomGenerator.name(2);
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: categoryName,
        slug: categorySlug,
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });

  // Step 3: Verify the created category has all required properties
  typia.assert(category);

  // Step 4: Verify the category status is 'active'
  TestValidator.equals(
    "category status should be active",
    category.status,
    "active",
  );

  // Step 5: Verify the category is immediately operational and visible
  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches input",
    category.slug,
    categorySlug,
  );
  TestValidator.predicate(
    "category product count is zero initially",
    category.product_count === 0,
  );
  TestValidator.predicate(
    "category is not soft deleted",
    category.deleted_at === null || category.deleted_at === undefined,
  );
}
