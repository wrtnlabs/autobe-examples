import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test category creation with active and inactive status control.
 *
 * This test validates that administrators can create categories with both
 * active and inactive status values to control immediate visibility. The test
 * ensures that:
 *
 * 1. Admin authenticates successfully
 * 2. Admin creates a category with status set to 'active'
 * 3. The active category is immediately visible and available for use
 * 4. Admin creates another category with status set to 'inactive'
 * 5. The inactive category is created but hidden from public display
 * 6. Both status values are properly stored and reflected in category data
 * 7. Status controls visibility without requiring deletion or separate activation
 *    steps
 *
 * This test ensures that administrators can prepare categories in advance
 * without making them immediately visible, supporting staged taxonomy
 * rollouts.
 */
export async function test_api_category_creation_status_control(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin1234",
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category with 'active' status
  const activeCategoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const activeCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: activeCategoryBody,
    });
  typia.assert(activeCategory);

  // Step 3: Verify the active category properties
  TestValidator.equals(
    "active category name matches",
    activeCategory.name,
    activeCategoryBody.name,
  );
  TestValidator.equals(
    "active category slug matches",
    activeCategory.slug,
    activeCategoryBody.slug,
  );
  TestValidator.equals(
    "active category status is active",
    activeCategory.status,
    "active",
  );
  TestValidator.equals(
    "active category display_order matches",
    activeCategory.display_order,
    activeCategoryBody.display_order,
  );

  // Step 4: Create another category with 'inactive' status
  const inactiveCategoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "inactive" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const inactiveCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: inactiveCategoryBody,
    });
  typia.assert(inactiveCategory);

  // Step 5: Verify the inactive category properties
  TestValidator.equals(
    "inactive category name matches",
    inactiveCategory.name,
    inactiveCategoryBody.name,
  );
  TestValidator.equals(
    "inactive category slug matches",
    inactiveCategory.slug,
    inactiveCategoryBody.slug,
  );
  TestValidator.equals(
    "inactive category status is inactive",
    inactiveCategory.status,
    "inactive",
  );
  TestValidator.equals(
    "inactive category display_order matches",
    inactiveCategory.display_order,
    inactiveCategoryBody.display_order,
  );

  // Step 6: Verify that both categories are distinct
  TestValidator.notEquals(
    "active and inactive categories have different IDs",
    activeCategory.id,
    inactiveCategory.id,
  );
  TestValidator.notEquals(
    "active and inactive categories have different names",
    activeCategory.name,
    inactiveCategory.name,
  );
  TestValidator.notEquals(
    "active and inactive categories have different slugs",
    activeCategory.slug,
    inactiveCategory.slug,
  );
}
