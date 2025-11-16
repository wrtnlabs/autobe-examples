import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test creating a category with all optional fields populated to verify
 * complete data handling.
 *
 * This test validates that the category creation operation properly handles
 * rich category data with comprehensive metadata for enhanced marketplace
 * organization and SEO. It ensures:
 *
 * 1. Admin authenticates successfully
 * 2. Parent category can be created for hierarchical relationships
 * 3. Child category with all optional fields (parent_id, description, image_url)
 *    creates successfully
 * 4. The system properly stores and returns all provided optional field values
 * 5. Description field accepts up to 1000 characters of text
 * 6. Image_url field accepts valid URI format
 * 7. Complete category entity reflects all provided data accurately
 * 8. All field constraints and validations work correctly
 */
export async function test_api_category_creation_with_all_optional_fields(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to obtain authorization tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // Step 2: Create parent category to reference in child category
  const parentCategoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: parentCategoryBody,
    });
  typia.assert(parentCategory);

  TestValidator.equals(
    "parent category name matches",
    parentCategory.name,
    parentCategoryBody.name,
  );

  TestValidator.equals(
    "parent category slug matches",
    parentCategory.slug,
    parentCategoryBody.slug,
  );

  // Step 3: Create child category with ALL optional fields populated
  const categoryDescription = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });

  const categoryImageUrl = typia.random<string & tags.Format<"uri">>();

  const childCategoryBody = {
    parent_id: parentCategory.id,
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: categoryDescription,
    image_url: categoryImageUrl,
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: childCategoryBody,
    });
  typia.assert(childCategory);

  // Step 4: Validate that all optional fields are properly stored and returned
  TestValidator.equals(
    "child category parent_id matches provided value",
    childCategory.parent_id,
    parentCategory.id,
  );

  TestValidator.equals(
    "child category description matches provided value",
    childCategory.description,
    categoryDescription,
  );

  TestValidator.equals(
    "child category image_url matches provided value",
    childCategory.image_url,
    categoryImageUrl,
  );

  // Step 5: Validate required fields are also properly set
  TestValidator.equals(
    "child category name matches",
    childCategory.name,
    childCategoryBody.name,
  );

  TestValidator.equals(
    "child category slug matches",
    childCategory.slug,
    childCategoryBody.slug,
  );

  TestValidator.equals(
    "child category display_order matches",
    childCategory.display_order,
    childCategoryBody.display_order,
  );

  TestValidator.equals(
    "child category status matches",
    childCategory.status,
    childCategoryBody.status,
  );

  // Step 6: Verify description length is within valid constraint
  TestValidator.predicate(
    "category description length is within 1000 character limit",
    categoryDescription.length <= 1000,
  );
}
