import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category creation with various slug formats to validate the URL-friendly
 * slug pattern requirements.
 *
 * This test ensures that the discussion board category creation endpoint
 * properly validates slug formats according to the required pattern:
 * ^[a-z0-9]+(?:-[a-z0-9]+)*$
 *
 * The test workflow:
 *
 * 1. Authenticate as a moderator (required for category creation)
 * 2. Create categories with valid slug formats
 * 3. Validate that created categories have correct slug formatting
 * 4. Test various valid slug patterns (simple, hyphenated, with numbers)
 */
export async function test_api_category_creation_slug_format_validation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator for category creation
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test valid slug formats
  const validSlugs = [
    "economic-discussion",
    "tech-news-2024",
    "politics-101",
    "general",
    "sports-and-recreation",
    "science-technology",
    "health-wellness-2025",
  ] as const;

  const createdCategories: IDiscussionBoardArticleCategory[] = [];

  for (let i = 0; i < validSlugs.length; i++) {
    const slug = validSlugs[i];
    const categoryData = {
      name: RandomGenerator.name(2),
      slug: slug,
      description: RandomGenerator.paragraph({ sentences: 5 }),
      sort_order: i,
    } satisfies IDiscussionBoardArticleCategory.ICreate;

    const category: IDiscussionBoardArticleCategory =
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: categoryData,
        },
      );
    typia.assert(category);

    // Validate the created category has the correct slug
    TestValidator.equals(
      "created category slug matches input",
      category.slug,
      slug,
    );

    // Validate slug pattern matches the required format
    TestValidator.predicate(
      "slug follows valid pattern",
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.slug),
    );

    // Validate other category properties
    TestValidator.equals(
      "category name matches input",
      category.name,
      categoryData.name,
    );
    TestValidator.equals(
      "category sort order matches input",
      category.sort_order,
      categoryData.sort_order,
    );

    createdCategories.push(category);
  }

  // Step 3: Verify all categories were created successfully
  TestValidator.equals(
    "all valid slug formats created successfully",
    createdCategories.length,
    validSlugs.length,
  );
}
