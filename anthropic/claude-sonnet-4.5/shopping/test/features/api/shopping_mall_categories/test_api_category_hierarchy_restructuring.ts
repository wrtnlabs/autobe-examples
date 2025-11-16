import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test restructuring category hierarchy by changing parent relationships.
 *
 * This test validates that categories can be moved to different positions in
 * the taxonomy tree by updating their parent_id. The scenario creates a
 * root-level category, then creates a child category under it, and finally
 * updates the child category to move it under a different parent or promote it
 * to root level by setting parent_id to null.
 *
 * The test ensures the category system supports flexible taxonomy management
 * while preventing invalid hierarchy configurations.
 *
 * Steps:
 *
 * 1. Authenticate as admin
 * 2. Create first parent category at root level
 * 3. Create second parent category at root level
 * 4. Create child category under first parent
 * 5. Move child category to second parent
 * 6. Promote child category to root level
 * 7. Validate all hierarchy changes
 */
export async function test_api_category_hierarchy_restructuring(
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

  // Step 2: Create first parent category at root level (Electronics)
  const parentCategory1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and gadgets",
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory1);
  TestValidator.equals(
    "first parent has no parent",
    parentCategory1.parent_id,
    null,
  );

  // Step 3: Create second parent category at root level (Home & Garden)
  const parentCategory2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        name: "Home & Garden",
        slug: "home-garden",
        description: "Home and garden products",
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 2,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory2);
  TestValidator.equals(
    "second parent has no parent",
    parentCategory2.parent_id,
    null,
  );

  // Step 4: Create child category under first parent (Smart Devices under Electronics)
  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory1.id,
        name: "Smart Devices",
        slug: "smart-devices",
        description: "Smart home devices and IoT products",
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory);
  TestValidator.equals(
    "child category initially under first parent",
    childCategory.parent_id,
    parentCategory1.id,
  );

  // Step 5: Move child category to second parent (Smart Devices moved to Home & Garden)
  const movedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.putByCategoryslug(
      connection,
      {
        categorySlug: childCategory.slug,
        body: {
          parent_id: parentCategory2.id,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(movedCategory);
  TestValidator.equals(
    "child category moved to second parent",
    movedCategory.parent_id,
    parentCategory2.id,
  );
  TestValidator.equals(
    "category ID unchanged after move",
    movedCategory.id,
    childCategory.id,
  );

  // Step 6: Promote child category to root level (Smart Devices becomes root category)
  const promotedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.putByCategoryslug(
      connection,
      {
        categorySlug: childCategory.slug,
        body: {
          parent_id: null,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(promotedCategory);
  TestValidator.equals(
    "child category promoted to root level",
    promotedCategory.parent_id,
    null,
  );
  TestValidator.equals(
    "category ID unchanged after promotion",
    promotedCategory.id,
    childCategory.id,
  );
}
