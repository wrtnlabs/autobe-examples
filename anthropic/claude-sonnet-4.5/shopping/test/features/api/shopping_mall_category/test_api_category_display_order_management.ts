import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test updating display_order to control category positioning in navigation
 * menus.
 *
 * This scenario validates that administrators can precisely control category
 * presentation sequence through display_order values. The test creates multiple
 * sibling categories (categories at the same hierarchy level with the same
 * parent) with different display_order values, then updates one category's
 * display_order to change its position in the sequence. The test validates that
 * lower display_order values appear first and that display_order changes
 * immediately affect category presentation order for merchandising
 * optimization.
 *
 * Steps:
 *
 * 1. Authenticate as admin
 * 2. Create parent category for organizing siblings
 * 3. Create first sibling category with display_order 100
 * 4. Create second sibling category with display_order 200
 * 5. Create third sibling category with display_order 300
 * 6. Update second category's display_order to 50 (move to first position)
 * 7. Validate that updated category now has display_order 50
 * 8. Verify categories are positioned correctly based on display_order values
 */
export async function test_api_category_display_order_management(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
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

  // Step 2: Create parent category for organizing siblings
  const parentCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);

  // Step 3: Create first sibling category with display_order 100
  const category1 = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: parentCategory.id,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 100,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category1);
  TestValidator.equals("category1 display_order", category1.display_order, 100);

  // Step 4: Create second sibling category with display_order 200
  const category2 = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: parentCategory.id,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 200,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category2);
  TestValidator.equals("category2 display_order", category2.display_order, 200);

  // Step 5: Create third sibling category with display_order 300
  const category3 = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: parentCategory.id,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 300,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category3);
  TestValidator.equals("category3 display_order", category3.display_order, 300);

  // Step 6: Update second category's display_order to 50 (move to first position)
  const updatedCategory =
    await api.functional.shoppingMall.admin.categories.putByCategoryslug(
      connection,
      {
        categorySlug: category2.slug,
        body: {
          display_order: 50,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 7: Validate that updated category now has display_order 50
  TestValidator.equals(
    "updated category display_order",
    updatedCategory.display_order,
    50,
  );
  TestValidator.equals(
    "updated category ID matches",
    updatedCategory.id,
    category2.id,
  );
  TestValidator.equals(
    "updated category name unchanged",
    updatedCategory.name,
    category2.name,
  );
  TestValidator.equals(
    "updated category slug unchanged",
    updatedCategory.slug,
    category2.slug,
  );
  TestValidator.equals(
    "updated category parent_id unchanged",
    updatedCategory.parent_id,
    category2.parent_id,
  );
  TestValidator.equals(
    "updated category status unchanged",
    updatedCategory.status,
    category2.status,
  );

  // Step 8: Verify categories are positioned correctly based on display_order values
  TestValidator.predicate(
    "category2 now has lowest display_order",
    updatedCategory.display_order < category1.display_order &&
      updatedCategory.display_order < category3.display_order,
  );
  TestValidator.predicate(
    "category1 display_order is between updated category2 and category3",
    updatedCategory.display_order < category1.display_order &&
      category1.display_order < category3.display_order,
  );
  TestValidator.predicate(
    "category3 still has highest display_order",
    category3.display_order > category1.display_order &&
      category3.display_order > updatedCategory.display_order,
  );
}
