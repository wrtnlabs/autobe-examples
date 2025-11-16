import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test updating category display order to control merchandising and navigation
 * sequence.
 *
 * This scenario validates that administrators can precisely control the visual
 * presentation order of product categories through the display_order field. The
 * test creates multiple sibling categories at the same hierarchy level with
 * different initial display_order values, then updates one category's
 * display_order to reposition it within the navigation sequence.
 *
 * Implementation steps:
 *
 * 1. Admin authentication - Register and authenticate as platform administrator
 * 2. Create multiple sibling categories with distinct display_order values
 * 3. Verify initial ordering based on display_order
 * 4. Update display order to move category to front of sequence
 * 5. Validate repositioning with lower display_order values taking precedence
 * 6. Test boundary case by moving category to end of sequence
 * 7. Validate complete ordering after all updates
 */
export async function test_api_category_update_display_order_positioning(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
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

  // Step 2: Create multiple sibling categories with different display_order values
  const category1 = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 10,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category1);

  const category2 = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 20,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category2);

  const category3 = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 30,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category3);

  const category4 = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 40,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category4);

  const category5 = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 50,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category5);

  // Step 3: Verify initial display_order values
  TestValidator.equals(
    "category1 initial display_order",
    category1.display_order,
    10,
  );
  TestValidator.equals(
    "category2 initial display_order",
    category2.display_order,
    20,
  );
  TestValidator.equals(
    "category3 initial display_order",
    category3.display_order,
    30,
  );
  TestValidator.equals(
    "category4 initial display_order",
    category4.display_order,
    40,
  );
  TestValidator.equals(
    "category5 initial display_order",
    category5.display_order,
    50,
  );

  // Step 4: Update category4 display_order to 5 to move it to the front
  const updatedCategory4 =
    await api.functional.shoppingMall.admin.categories.putByCategorycode(
      connection,
      {
        categoryCode: category4.slug,
        body: {
          display_order: 5,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory4);

  // Step 5: Validate repositioning - category4 now has lower display_order
  TestValidator.equals(
    "category4 updated display_order",
    updatedCategory4.display_order,
    5,
  );
  TestValidator.predicate(
    "category4 now has lowest display_order",
    updatedCategory4.display_order < category1.display_order,
  );

  // Step 6: Test boundary case - update category2 to highest display_order
  const updatedCategory2 =
    await api.functional.shoppingMall.admin.categories.putByCategorycode(
      connection,
      {
        categoryCode: category2.slug,
        body: {
          display_order: 100,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory2);

  // Step 7: Validate complete ordering
  TestValidator.equals(
    "category2 moved to end",
    updatedCategory2.display_order,
    100,
  );
  TestValidator.predicate(
    "category2 has highest display_order",
    updatedCategory2.display_order > category5.display_order,
  );

  // Verify final ordering sequence
  const expectedOrdering = [
    { name: "category4", order: 5 },
    { name: "category1", order: 10 },
    { name: "category3", order: 30 },
    { name: "category5", order: 50 },
    { name: "category2", order: 100 },
  ];

  TestValidator.predicate(
    "final ordering is correct",
    updatedCategory4.display_order < category1.display_order &&
      category1.display_order < category3.display_order &&
      category3.display_order < category5.display_order &&
      category5.display_order < updatedCategory2.display_order,
  );
}
