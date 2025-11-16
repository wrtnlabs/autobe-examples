import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test creating multiple categories with different display_order values to
 * control presentation sequence.
 *
 * This test validates that administrators can precisely control category
 * positioning within the same hierarchy level through the display_order
 * property. The scenario demonstrates merchandising optimization by creating
 * multiple sibling categories with distinct ordering values.
 *
 * Process:
 *
 * 1. Authenticate as platform administrator
 * 2. Create multiple root-level categories with different display_order values (1,
 *    2, 3)
 * 3. Verify each category is created with the correct display_order value
 * 4. Validate that categories maintain their assigned display sequence
 */
export async function test_api_category_display_order_control(
  connection: api.IConnection,
) {
  // 1. Authenticate as platform administrator
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

  // 2. Create multiple root-level categories with sequential display_order values
  const categoryData = [
    { name: "Electronics", slug: "electronics", display_order: 1 },
    { name: "Fashion", slug: "fashion", display_order: 2 },
    { name: "Home & Garden", slug: "home-garden", display_order: 3 },
  ];

  const createdCategories: IShoppingMallCategory[] = await ArrayUtil.asyncMap(
    categoryData,
    async (data) => {
      const category: IShoppingMallCategory =
        await api.functional.shoppingMall.admin.categories.create(connection, {
          body: {
            parent_id: null,
            name: data.name,
            slug: data.slug,
            description: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 5,
              wordMax: 10,
            }),
            image_url: typia.random<string & tags.Format<"uri">>(),
            display_order: data.display_order,
            status: "active",
          } satisfies IShoppingMallCategory.ICreate,
        });
      typia.assert(category);
      return category;
    },
  );

  // 3. Verify each category has the correct display_order value
  TestValidator.equals(
    "first category display order",
    createdCategories[0].display_order,
    1,
  );

  TestValidator.equals(
    "second category display order",
    createdCategories[1].display_order,
    2,
  );

  TestValidator.equals(
    "third category display order",
    createdCategories[2].display_order,
    3,
  );

  // 4. Validate all categories are active and properly created
  for (const category of createdCategories) {
    TestValidator.equals(
      "category status is active",
      category.status,
      "active",
    );

    TestValidator.predicate("category has valid UUID", category.id.length > 0);

    TestValidator.equals(
      "category parent_id is null for root level",
      category.parent_id,
      null,
    );
  }
}
