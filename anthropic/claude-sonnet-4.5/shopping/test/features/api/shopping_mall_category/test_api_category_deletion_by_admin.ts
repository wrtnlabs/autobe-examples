import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test the complete workflow of an administrator permanently deleting a product
 * category.
 *
 * This test validates that:
 *
 * 1. An admin can successfully authenticate and create a new category
 * 2. The admin can then permanently delete that category using its unique
 *    identifier
 * 3. The deletion operation completely removes the category from the database
 *    (hard delete)
 * 4. All operations execute successfully with proper authorization
 *
 * Steps:
 *
 * 1. Authenticate as admin by joining with valid credentials
 * 2. Create a test category with valid data
 * 3. Delete the created category by its ID
 * 4. Verify all operations complete successfully
 */
export async function test_api_category_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to obtain authorization tokens
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Create a test category that will be permanently deleted
  const categoryCreateData = {
    parent_id: null,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: RandomGenerator.pick(["active", "inactive"] as const),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateData,
    });
  typia.assert(category);

  // Step 3: Permanently delete the created category using its unique identifier
  await api.functional.shoppingMall.admin.categories.erase(connection, {
    categoryId: category.id,
  });
}
