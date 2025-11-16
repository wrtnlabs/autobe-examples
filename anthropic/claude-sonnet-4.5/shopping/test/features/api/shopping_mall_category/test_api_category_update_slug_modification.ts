import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test updating category slug for URL restructuring and SEO optimization.
 *
 * This test validates that administrators can modify category slugs to optimize
 * URLs for search engines and improve marketplace organization. The test
 * ensures that slug changes are properly applied and that uniqueness
 * constraints prevent routing conflicts.
 *
 * Workflow:
 *
 * 1. Authenticate as admin user
 * 2. Create initial category with original slug
 * 3. Update category slug to new SEO-friendly value
 * 4. Verify slug change was applied correctly
 * 5. Create second category to test uniqueness constraint
 * 6. Attempt to update second category with duplicate slug (should fail)
 * 7. Verify original category maintains integrity
 */
export async function test_api_category_update_slug_modification(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
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

  // Step 2: Create initial category with original slug
  const originalSlug = "electronics-devices";
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Electronics & Devices",
        slug: originalSlug,
        description: "All electronic devices and gadgets",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  TestValidator.equals(
    "initial category slug matches",
    category.slug,
    originalSlug,
  );
  TestValidator.equals(
    "initial category name",
    category.name,
    "Electronics & Devices",
  );
  TestValidator.equals("initial category status", category.status, "active");

  // Step 3: Update category slug to new SEO-friendly value
  const newSlug = "consumer-electronics";
  const updatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.putByCategorycode(
      connection,
      {
        categoryCode: category.id,
        body: {
          slug: newSlug,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Verify slug change was applied correctly
  TestValidator.equals(
    "category ID unchanged after update",
    updatedCategory.id,
    category.id,
  );
  TestValidator.equals(
    "slug successfully updated",
    updatedCategory.slug,
    newSlug,
  );
  TestValidator.equals(
    "category name preserved after slug update",
    updatedCategory.name,
    category.name,
  );
  TestValidator.equals(
    "category status preserved after slug update",
    updatedCategory.status,
    category.status,
  );
  TestValidator.equals(
    "category description preserved",
    updatedCategory.description,
    category.description,
  );

  // Step 5: Create second category to test uniqueness constraint
  const secondCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Home Appliances",
        slug: "home-appliances",
        description: "Kitchen and home appliances",
        display_order: 2,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(secondCategory);

  TestValidator.equals(
    "second category created with unique slug",
    secondCategory.slug,
    "home-appliances",
  );

  // Step 6: Attempt to update second category with duplicate slug (should fail)
  await TestValidator.error(
    "updating category with duplicate slug should fail",
    async () => {
      await api.functional.shoppingMall.admin.categories.putByCategorycode(
        connection,
        {
          categoryCode: secondCategory.id,
          body: {
            slug: newSlug,
          } satisfies IShoppingMallCategory.IUpdate,
        },
      );
    },
  );

  // Step 7: Verify original category maintains integrity after failed duplicate attempt
  TestValidator.equals(
    "original category slug unchanged",
    updatedCategory.slug,
    newSlug,
  );
  TestValidator.equals(
    "original category name unchanged",
    updatedCategory.name,
    "Electronics & Devices",
  );
}
