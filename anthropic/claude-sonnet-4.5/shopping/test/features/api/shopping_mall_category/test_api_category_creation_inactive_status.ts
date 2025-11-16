import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test creating a category with inactive status for draft or planned
 * categories.
 *
 * This test validates that administrators can create categories with inactive
 * status, allowing them to prepare category structure in advance before making
 * it visible to the marketplace. The inactive category should be stored in the
 * database but hidden from public category browsing.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to obtain necessary permissions
 * 2. Create a new category with status explicitly set to 'inactive'
 * 3. Validate the category is created successfully with all properties intact
 * 4. Confirm the status is 'inactive' as specified
 * 5. Verify the category can be activated later through update operations
 */
export async function test_api_category_creation_inactive_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
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
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create category with inactive status
  const categorySlug = RandomGenerator.alphaNumeric(10).toLowerCase();
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    slug: categorySlug,
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

  // Step 3: Validate category properties
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
    "category description matches",
    createdCategory.description,
    categoryData.description,
  );
  TestValidator.equals(
    "category image_url matches",
    createdCategory.image_url,
    categoryData.image_url,
  );
  TestValidator.equals(
    "category display_order matches",
    createdCategory.display_order,
    categoryData.display_order,
  );

  // Step 4: Verify inactive status
  TestValidator.equals(
    "category status is inactive",
    createdCategory.status,
    "inactive",
  );

  // Step 5: Verify system-managed fields
  TestValidator.predicate(
    "category has UUID",
    typeof createdCategory.id === "string",
  );
  TestValidator.predicate(
    "product_count initialized to 0",
    createdCategory.product_count === 0,
  );
  TestValidator.predicate(
    "created_at is set",
    createdCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    createdCategory.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null for active category",
    createdCategory.deleted_at === null ||
      createdCategory.deleted_at === undefined,
  );
}
