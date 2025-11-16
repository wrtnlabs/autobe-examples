import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test category creation with optional description field (max 500 characters).
 *
 * Verifies that categories can be created with various description values
 * including omitted, null, empty string, and various lengths up to the 500
 * character maximum. Confirms that descriptions are preserved exactly as
 * provided and that all category properties are correctly stored and returned.
 *
 * Test flow:
 *
 * 1. Create and authenticate an administrator account
 * 2. Create categories with different description scenarios
 * 3. Validate each category's description matches the input
 * 4. Verify category metadata (ID, slug, name, timestamps, active status)
 */
export async function test_api_category_creation_optional_description(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Test category creation with omitted description
  const categoryOmitted: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryOmitted);
  TestValidator.equals(
    "category with omitted description should have undefined/null description",
    categoryOmitted.description === undefined ||
      categoryOmitted.description === null,
    true,
  );

  // 3. Test category creation with null description
  const categoryNull: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Entertainment",
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: null,
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryNull);
  TestValidator.equals(
    "category with null description should have null description",
    categoryNull.description,
    null,
  );

  // 4. Test category creation with empty string description
  const categoryEmpty: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Sports",
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: "",
          display_order: 3,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryEmpty);
  TestValidator.equals(
    "category with empty string description should have empty string",
    categoryEmpty.description,
    "",
  );

  // 5. Test category creation with short description
  const shortDesc = "Discuss technology trends and innovations";
  const categoryShort: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Science",
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: shortDesc,
          display_order: 4,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryShort);
  TestValidator.equals(
    "short description should be preserved exactly",
    categoryShort.description,
    shortDesc,
  );

  // 6. Test category creation with medium length description
  const mediumDesc = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const categoryMedium: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Business",
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: mediumDesc,
          display_order: 5,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryMedium);
  TestValidator.equals(
    "medium description should be preserved exactly",
    categoryMedium.description,
    mediumDesc,
  );

  // 7. Test category creation with maximum length description (500 characters)
  const maxDesc = RandomGenerator.paragraph({
    sentences: 40,
    wordMin: 2,
    wordMax: 5,
  }).substring(0, 500);
  const categoryMax: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Lifestyle",
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: maxDesc,
          display_order: 6,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryMax);
  TestValidator.equals(
    "maximum length description should be preserved exactly",
    categoryMax.description,
    maxDesc,
  );

  // 8. Validate all categories have proper structure
  const allCategories = [
    categoryOmitted,
    categoryNull,
    categoryEmpty,
    categoryShort,
    categoryMedium,
    categoryMax,
  ];

  await ArrayUtil.asyncForEach(allCategories, async (category) => {
    TestValidator.predicate(
      "category name should be non-empty",
      category.name.length > 0,
    );

    TestValidator.predicate(
      "category slug should match pattern",
      /^[a-z0-9-]+$/.test(category.slug),
    );

    TestValidator.predicate(
      "category should be active",
      category.is_active === true,
    );

    TestValidator.predicate(
      "category should have created_at timestamp",
      category.created_at !== null && category.created_at !== undefined,
    );

    TestValidator.predicate(
      "category should have updated_at timestamp",
      category.updated_at !== null && category.updated_at !== undefined,
    );

    TestValidator.predicate(
      "display_order should be non-negative",
      category.display_order >= 0,
    );
  });
}
