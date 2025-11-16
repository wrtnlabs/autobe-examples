import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test creating a category with all optional fields populated including
 * description and image_url.
 *
 * This test verifies that a fully-detailed category can be created with
 * comprehensive metadata for enhanced user experience. It validates that the
 * description (up to 1000 characters) and image_url (valid URI format) are
 * stored correctly and returned in subsequent retrievals. This ensures admins
 * can create rich, well-documented categories with visual elements.
 *
 * Steps:
 *
 * 1. Authenticate as admin to obtain necessary permissions
 * 2. Prepare category data with all fields populated (including optional
 *    description and image_url)
 * 3. Create the category via POST /shoppingMall/admin/categories
 * 4. Validate the response contains all submitted data
 * 5. Verify description and image_url are stored correctly
 */
export async function test_api_category_creation_with_all_fields(
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

  // Step 2: Prepare category data with ALL fields populated
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");

  // Generate description with substantial content (close to max length)
  const categoryDescription = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const categoryData = {
    name: categoryName,
    slug: categorySlug,
    description: categoryDescription,
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  // Step 3: Create category with all fields
  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(createdCategory);

  // Step 4: Validate response contains all submitted data
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
    "category status matches",
    createdCategory.status,
    categoryData.status,
  );
  TestValidator.equals(
    "category display_order matches",
    createdCategory.display_order,
    categoryData.display_order,
  );

  // Step 5: Verify optional fields (description and image_url) are stored correctly
  TestValidator.equals(
    "category description is stored",
    createdCategory.description,
    categoryData.description,
  );
  TestValidator.equals(
    "category image_url is stored",
    createdCategory.image_url,
    categoryData.image_url,
  );

  // Additional validations
  TestValidator.predicate(
    "category has valid UUID",
    createdCategory.id !== null && createdCategory.id !== undefined,
  );
  TestValidator.predicate(
    "category has created_at timestamp",
    createdCategory.created_at !== null &&
      createdCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "category has updated_at timestamp",
    createdCategory.updated_at !== null &&
      createdCategory.updated_at !== undefined,
  );
  TestValidator.equals(
    "category product_count is initialized to 0",
    createdCategory.product_count,
    0,
  );
}
