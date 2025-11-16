import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test creating a category with status='inactive' to create it in a hidden
 * state.
 *
 * This test validates that administrators can create categories that are not
 * immediately visible to buyers and sellers. The workflow consists of:
 *
 * 1. Admin authentication - Register and authenticate as a platform administrator
 * 2. Create inactive category - Create a category with status='inactive'
 * 3. Verify category creation - Confirm category was created with correct inactive
 *    status
 * 4. Validate hidden state - Ensure category preserves configuration for future
 *    activation
 */
export async function test_api_category_inactive_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
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

  // Step 2: Create a category with status='inactive'
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "inactive" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(createdCategory);

  // Step 3: Verify that the category was created with inactive status
  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category slug matches",
    createdCategory.slug,
    categoryData.slug,
  );
  TestValidator.equals(
    "category status is inactive",
    createdCategory.status,
    "inactive",
  );

  // Step 4: Validate that the category preserves its configuration
  TestValidator.equals(
    "category description preserved",
    createdCategory.description,
    categoryData.description,
  );
  TestValidator.equals(
    "category display_order preserved",
    createdCategory.display_order,
    categoryData.display_order,
  );
  TestValidator.equals(
    "category image_url preserved",
    createdCategory.image_url,
    categoryData.image_url,
  );

  // Verify category has initial product_count of 0
  TestValidator.equals(
    "initial product count is 0",
    createdCategory.product_count,
    0,
  );

  // Verify category has proper timestamps
  TestValidator.predicate(
    "created_at exists",
    createdCategory.created_at !== null &&
      createdCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    createdCategory.updated_at !== null &&
      createdCategory.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null for active category",
    createdCategory.deleted_at,
    null,
  );
}
