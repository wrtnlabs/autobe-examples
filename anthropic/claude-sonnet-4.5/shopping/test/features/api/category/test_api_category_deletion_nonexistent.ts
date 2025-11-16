import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test that attempting to delete a non-existent category returns appropriate
 * error handling.
 *
 * This test validates the API's error handling when an admin attempts to delete
 * a category that does not exist in the system. The test follows these steps:
 *
 * 1. Admin authenticates successfully by registering a new admin account
 * 2. Generate a valid UUID that does not correspond to any existing category
 * 3. Attempt to delete the non-existent category
 * 4. Verify that the API returns an appropriate error response
 *
 * This ensures proper error handling for invalid category references and
 * provides clear feedback to administrators when they attempt operations on
 * non-existent resources.
 */
export async function test_api_category_deletion_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates by registering a new account
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

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Generate a non-existent category ID (valid UUID format)
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3 & 4: Attempt to delete the non-existent category and verify error
  await TestValidator.error(
    "deleting non-existent category should fail",
    async () => {
      await api.functional.shoppingMall.admin.categories.erase(connection, {
        categoryId: nonExistentCategoryId,
      });
    },
  );
}
