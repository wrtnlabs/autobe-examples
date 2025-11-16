import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that category retrieval response includes all required and optional
 * fields.
 *
 * Creates a category with both required and optional fields, then retrieves it
 * to verify that all fields are present in the response. This validates the
 * complete response structure matches the ICommunityPlatformCategory schema.
 *
 * Steps:
 *
 * 1. Create administrator account for authentication
 * 2. Create a category with all required and optional fields
 * 3. Retrieve the category by ID
 * 4. Validate all fields are present in the response
 */
export async function test_api_category_retrieval_all_fields_present(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePass123",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category with all required and optional fields
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 2,
    wordMax: 3,
  });
  const slugWords = [
    RandomGenerator.alphabets(5),
    RandomGenerator.alphabets(4),
  ];
  const categorySlug = slugWords.join("-").toLowerCase();
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 6,
  });
  const categoryIconUrl =
    "https://example.com/icons/" + RandomGenerator.alphabets(8) + ".png";
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: categoryDescription,
          icon_url: categoryIconUrl,
          display_order: displayOrder,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Retrieve the category by ID
  const retrievedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.at(connection, {
      categoryId: createdCategory.id,
    });
  typia.assert(retrievedCategory);

  // Step 4: Validate all fields are present in the response
  TestValidator.equals(
    "category ID matches",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches",
    retrievedCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category description matches",
    retrievedCategory.description,
    categoryDescription,
  );
  TestValidator.equals(
    "category icon URL matches",
    retrievedCategory.icon_url,
    categoryIconUrl,
  );
  TestValidator.equals(
    "category display order matches",
    retrievedCategory.display_order,
    displayOrder,
  );
  TestValidator.predicate(
    "category is_active field exists and is boolean",
    typeof retrievedCategory.is_active === "boolean",
  );
  TestValidator.predicate(
    "category created_at field exists",
    retrievedCategory.created_at !== undefined &&
      retrievedCategory.created_at !== null,
  );
  TestValidator.predicate(
    "category updated_at field exists",
    retrievedCategory.updated_at !== undefined &&
      retrievedCategory.updated_at !== null,
  );
}
