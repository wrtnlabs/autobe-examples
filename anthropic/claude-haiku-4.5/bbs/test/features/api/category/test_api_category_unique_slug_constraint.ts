import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that category slugs must be unique across the system.
 *
 * This test validates slug uniqueness constraints in the category creation API.
 * A moderator authenticates and creates a category with a specific slug, then
 * attempts to create another category with the same slug to verify the system
 * properly rejects duplicate slugs.
 *
 * Steps:
 *
 * 1. Moderator registers/authenticates with valid credentials
 * 2. Create first category with slug 'technology-trends'
 * 3. Attempt to create second category with same slug and verify error
 * 4. Verify slug format validation (lowercase alphanumeric with hyphens)
 * 5. Verify name uniqueness is separate from slug uniqueness
 */
export async function test_api_category_unique_slug_constraint(
  connection: api.IConnection,
) {
  // Step 1: Authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(12),
        password: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create first category with slug 'technology-trends'
  const firstCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Technology Trends",
          slug: "technology-trends",
          description: "Discussion on latest technology trends and innovations",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(firstCategory);
  TestValidator.equals(
    "first category slug matches",
    firstCategory.slug,
    "technology-trends",
  );

  // Step 3: Attempt to create second category with same slug and verify error
  await TestValidator.error("duplicate slug should fail", async () => {
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Tech Trends Discussion",
          slug: "technology-trends",
          description: "Another category with duplicate slug",
          display_order: 2,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  });

  // Step 4: Verify different slug with different name works
  const secondCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Technology Trends",
          slug: "tech-innovations",
          description: "Similar name but different slug",
          display_order: 3,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(secondCategory);
  TestValidator.equals(
    "second category slug matches",
    secondCategory.slug,
    "tech-innovations",
  );
  TestValidator.notEquals(
    "slugs are different",
    firstCategory.slug,
    secondCategory.slug,
  );

  // Step 5: Verify slug format validation - valid lowercase alphanumeric with hyphens
  const validSlugCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economics and Finance",
          slug: "economics-finance-2024",
          description: "Discussion about economics",
          display_order: 4,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(validSlugCategory);
  TestValidator.equals(
    "valid slug format accepted",
    validSlugCategory.slug,
    "economics-finance-2024",
  );

  // Step 6: Test that each slug remains unique
  TestValidator.predicate(
    "all slugs are unique",
    new Set([firstCategory.slug, secondCategory.slug, validSlugCategory.slug])
      .size === 3,
  );
}
