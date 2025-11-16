import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test changing category visibility status from active to inactive and vice
 * versa.
 *
 * This test validates that administrators can control category visibility
 * through status management. The test creates an active category, updates its
 * status to inactive, verifies the status change is applied correctly, and then
 * reactivates the category by changing status back to active. This validates
 * the business rule that inactive categories are hidden from public display
 * while preserving historical data, and that status transitions immediately
 * affect category visibility throughout the platform.
 *
 * Test workflow:
 *
 * 1. Create and authenticate admin account
 * 2. Create a new category with active status
 * 3. Update category status to inactive
 * 4. Verify status change was applied correctly
 * 5. Reactivate category by changing status back to active
 * 6. Verify reactivation was successful
 */
export async function test_api_category_status_change(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminPassword123!",
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a new category with active status
  const categorySlug = RandomGenerator.alphaNumeric(12);
  const categoryName = RandomGenerator.name(2);

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: categoryName,
        slug: categorySlug,
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(createdCategory);

  TestValidator.equals(
    "category created with active status",
    createdCategory.status,
    "active",
  );
  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches",
    createdCategory.slug,
    categorySlug,
  );

  // Step 3: Update category status to inactive
  const inactiveCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.putByCategoryslug(
      connection,
      {
        categorySlug: categorySlug,
        body: {
          status: "inactive",
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(inactiveCategory);

  // Step 4: Verify status change to inactive was applied correctly
  TestValidator.equals(
    "category status changed to inactive",
    inactiveCategory.status,
    "inactive",
  );
  TestValidator.equals(
    "category ID remains same",
    inactiveCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name preserved",
    inactiveCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug preserved",
    inactiveCategory.slug,
    categorySlug,
  );

  // Step 5: Reactivate category by changing status back to active
  const reactivatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.putByCategoryslug(
      connection,
      {
        categorySlug: categorySlug,
        body: {
          status: "active",
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(reactivatedCategory);

  // Step 6: Verify reactivation was successful
  TestValidator.equals(
    "category status changed back to active",
    reactivatedCategory.status,
    "active",
  );
  TestValidator.equals(
    "category ID remains same after reactivation",
    reactivatedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name still preserved",
    reactivatedCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug still preserved",
    reactivatedCategory.slug,
    categorySlug,
  );
}
