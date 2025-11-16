import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test creating a category with optional metadata fields for enhanced user
 * experience.
 *
 * This test validates that marketplace categories can be created with rich
 * metadata including detailed descriptions and visual elements. The description
 * field provides buyers with comprehensive information about category scope and
 * classification rules, while the image_url enables visual navigation through
 * category banner images or icons.
 *
 * Test workflow:
 *
 * 1. Authenticate as platform administrator
 * 2. Create category with complete metadata (description and image_url)
 * 3. Verify all metadata fields are properly stored and returned
 * 4. Confirm category is ready for product assignment and buyer navigation
 */
export async function test_api_category_creation_with_metadata(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to gain category management privileges
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

  // Step 2: Prepare category data with rich metadata
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const categorySlug = RandomGenerator.alphaNumeric(12);
  const categoryDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const categoryImageUrl = typia.random<string & tags.Format<"uri">>();

  // Step 3: Create category with optional metadata fields
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        name: categoryName,
        slug: categorySlug,
        description: categoryDescription,
        image_url: categoryImageUrl,
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 4: Validate that all metadata fields are properly stored
  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches input",
    category.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category description is preserved",
    category.description,
    categoryDescription,
  );
  TestValidator.equals(
    "category image URL is stored correctly",
    category.image_url,
    categoryImageUrl,
  );
  TestValidator.equals("category status is active", category.status, "active");
}
