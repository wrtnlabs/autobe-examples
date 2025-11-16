import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test updating category parent relationships to restructure the taxonomy
 * hierarchy.
 *
 * This test validates the ability to change parent-child relationships in the
 * category tree structure. It creates a multi-level category hierarchy with a
 * root category, two sibling categories, and a child category, then updates the
 * child category to change its parent from one sibling to another.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to obtain category management privileges
 * 2. Create a root category (top-level parent)
 * 3. Create first parent category under the root
 * 4. Create second parent category under the root
 * 5. Create a child category initially assigned to the first parent
 * 6. Update the child category to reassign it to the second parent
 * 7. Validate the parent_id change and verify other attributes remain unchanged
 */
export async function test_api_category_update_parent_hierarchy(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin for category management operations
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

  // Step 2: Create root category (top-level parent)
  const rootCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(rootCategory);

  // Step 3: Create first parent category under the root
  const firstParent: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: rootCategory.id,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(firstParent);

  // Step 4: Create second parent category under the root
  const secondParent: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: rootCategory.id,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(secondParent);

  // Step 5: Create child category initially assigned to the first parent
  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: firstParent.id,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory);

  // Verify initial parent assignment
  TestValidator.equals(
    "initial parent assignment",
    childCategory.parent_id,
    firstParent.id,
  );

  // Step 6: Update the child category to reassign it to the second parent
  const updatedChild: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.putByCategorycode(
      connection,
      {
        categoryCode: childCategory.slug,
        body: {
          parent_id: secondParent.id,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedChild);

  // Step 7: Validate the parent_id change
  TestValidator.equals(
    "parent reassignment successful",
    updatedChild.parent_id,
    secondParent.id,
  );
  TestValidator.notEquals(
    "parent changed from first to second",
    updatedChild.parent_id,
    firstParent.id,
  );

  // Verify other attributes remain unchanged
  TestValidator.equals(
    "category ID unchanged",
    updatedChild.id,
    childCategory.id,
  );
  TestValidator.equals(
    "category name unchanged",
    updatedChild.name,
    childCategory.name,
  );
  TestValidator.equals(
    "category slug unchanged",
    updatedChild.slug,
    childCategory.slug,
  );
  TestValidator.equals(
    "category status unchanged",
    updatedChild.status,
    childCategory.status,
  );
}
