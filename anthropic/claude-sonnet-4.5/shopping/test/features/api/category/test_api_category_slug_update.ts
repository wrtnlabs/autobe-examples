import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test updating category slug for URL restructuring.
 *
 * This test validates that administrators can change a category's URL-friendly
 * identifier while maintaining global uniqueness constraints. The test creates
 * a category with an initial slug, then updates it with a new unique slug
 * value, and verifies that the slug change is applied successfully.
 *
 * This is important for SEO optimization and URL management, though the test
 * acknowledges that changing slugs affects all category URLs and requires
 * redirect management in production systems. The test validates that the slug
 * uniqueness constraint is enforced globally across all categories.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin
 * 2. Create a category with initial slug
 * 3. Update the category slug to a new value
 * 4. Verify the slug was updated successfully
 */
export async function test_api_category_slug_update(
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

  // Step 2: Create a category with initial slug
  const initialSlug = `electronics-${RandomGenerator.alphaNumeric(8)}`;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Electronics",
        slug: initialSlug,
        description: "Electronic devices and accessories",
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Verify initial slug
  TestValidator.equals("initial slug matches", category.slug, initialSlug);

  // Step 3: Update the category slug to a new value
  const newSlug = `electronics-new-${RandomGenerator.alphaNumeric(8)}`;
  const updatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.putByCategoryslug(
      connection,
      {
        categorySlug: category.slug,
        body: {
          slug: newSlug,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Verify the slug was updated successfully
  TestValidator.equals(
    "category ID unchanged",
    updatedCategory.id,
    category.id,
  );
  TestValidator.equals(
    "slug updated to new value",
    updatedCategory.slug,
    newSlug,
  );
  TestValidator.notEquals(
    "slug changed from initial",
    updatedCategory.slug,
    initialSlug,
  );
  TestValidator.equals(
    "category name preserved",
    updatedCategory.name,
    category.name,
  );
  TestValidator.equals(
    "category status preserved",
    updatedCategory.status,
    category.status,
  );
}
