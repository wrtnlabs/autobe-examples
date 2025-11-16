import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test creating categories with specific display_order values to control
 * presentation sequence.
 *
 * This test validates merchandising control where admins can position important
 * categories prominently by assigning lower display_order values. Multiple
 * sibling categories (same parent level) are created with different
 * display_order values to verify they maintain the intended sequence for
 * presentation.
 *
 * Steps:
 *
 * 1. Authenticate as admin user
 * 2. Create parent category to establish sibling context
 * 3. Create multiple child categories with different display_order values
 * 4. Validate that display_order values are preserved and control positioning
 */
export async function test_api_category_creation_custom_display_order(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
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

  // Step 2: Create parent category to establish sibling context
  const parentCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        slug: `parent-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);

  // Step 3: Create multiple child categories with different display_order values
  // Using display_order values: 10, 5, 20, 1 to demonstrate ordering control

  const childCategory1 =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        slug: `child-featured-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 7,
        }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 10,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory1);

  const childCategory2 =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        slug: `child-priority-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 7,
        }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 5,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory2);

  const childCategory3 =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        slug: `child-standard-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 7,
        }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 20,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory3);

  const childCategory4 =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        slug: `child-top-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 7,
        }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory4);

  // Step 4: Validate that display_order values are preserved as specified
  TestValidator.equals(
    "child category 1 display order",
    childCategory1.display_order,
    10,
  );
  TestValidator.equals(
    "child category 2 display order",
    childCategory2.display_order,
    5,
  );
  TestValidator.equals(
    "child category 3 display order",
    childCategory3.display_order,
    20,
  );
  TestValidator.equals(
    "child category 4 display order",
    childCategory4.display_order,
    1,
  );

  // Validate sibling relationship - all children share the same parent
  TestValidator.equals(
    "child category 1 parent",
    childCategory1.parent_id,
    parentCategory.id,
  );
  TestValidator.equals(
    "child category 2 parent",
    childCategory2.parent_id,
    parentCategory.id,
  );
  TestValidator.equals(
    "child category 3 parent",
    childCategory3.parent_id,
    parentCategory.id,
  );
  TestValidator.equals(
    "child category 4 parent",
    childCategory4.parent_id,
    parentCategory.id,
  );

  // Validate ordering logic - lower display_order means higher priority
  TestValidator.predicate(
    "category 4 has highest priority (lowest display_order)",
    childCategory4.display_order < childCategory2.display_order &&
      childCategory4.display_order < childCategory1.display_order &&
      childCategory4.display_order < childCategory3.display_order,
  );

  TestValidator.predicate(
    "category 2 has second priority",
    childCategory2.display_order < childCategory1.display_order &&
      childCategory2.display_order < childCategory3.display_order,
  );

  TestValidator.predicate(
    "category 1 has third priority",
    childCategory1.display_order < childCategory3.display_order,
  );

  // Validate all categories are active
  TestValidator.equals(
    "parent category status",
    parentCategory.status,
    "active",
  );
  TestValidator.equals(
    "child category 1 status",
    childCategory1.status,
    "active",
  );
  TestValidator.equals(
    "child category 2 status",
    childCategory2.status,
    "active",
  );
  TestValidator.equals(
    "child category 3 status",
    childCategory3.status,
    "active",
  );
  TestValidator.equals(
    "child category 4 status",
    childCategory4.status,
    "active",
  );
}
