import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test category creation with custom display_order values for presentation
 * control.
 *
 * This test validates that administrators can create multiple categories with
 * specific display_order values to control the sequence in which categories are
 * presented in navigation menus and category lists. Lower display_order values
 * appear before higher values, enabling precise merchandising control.
 *
 * Test workflow:
 *
 * 1. Admin authenticates successfully
 * 2. Admin creates 5 sibling categories with varied display_order values (10, 5,
 *    30, 1, 20)
 * 3. Each category is verified to have its specified display_order
 * 4. Categories are sorted by display_order to verify correct positioning
 * 5. Sorted order is validated to ensure lower values appear first
 */
export async function test_api_category_creation_display_order(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create multiple sibling categories with different display_order values
  const displayOrders = [10, 5, 30, 1, 20];
  const categories: IShoppingMallCategory[] = [];

  for (const order of displayOrders) {
    const categoryData = {
      parent_id: null,
      name: RandomGenerator.name(2),
      slug: RandomGenerator.alphaNumeric(8),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      image_url: typia.random<string & tags.Format<"uri">>(),
      display_order: order,
      status: "active" as const,
    } satisfies IShoppingMallCategory.ICreate;

    const category: IShoppingMallCategory =
      await api.functional.shoppingMall.admin.categories.create(connection, {
        body: categoryData,
      });
    typia.assert(category);

    // Step 3: Verify each category has its specified display_order
    TestValidator.equals(
      "category display_order matches requested value",
      category.display_order,
      order,
    );

    categories.push(category);
  }

  // Step 4: Sort categories by display_order
  const sortedCategories = [...categories].sort(
    (a, b) => a.display_order - b.display_order,
  );

  // Step 5: Validate correct ordering (lower display_order values first)
  TestValidator.equals(
    "first category has lowest display_order",
    sortedCategories[0].display_order,
    1,
  );

  TestValidator.equals(
    "second category has second lowest display_order",
    sortedCategories[1].display_order,
    5,
  );

  TestValidator.equals(
    "third category has middle display_order",
    sortedCategories[2].display_order,
    10,
  );

  TestValidator.equals(
    "fourth category has second highest display_order",
    sortedCategories[3].display_order,
    20,
  );

  TestValidator.equals(
    "fifth category has highest display_order",
    sortedCategories[4].display_order,
    30,
  );

  // Verify ascending order predicate
  TestValidator.predicate(
    "categories are sorted in ascending display_order",
    sortedCategories.every(
      (cat, idx) =>
        idx === 0 ||
        sortedCategories[idx - 1].display_order < cat.display_order,
    ),
  );
}
