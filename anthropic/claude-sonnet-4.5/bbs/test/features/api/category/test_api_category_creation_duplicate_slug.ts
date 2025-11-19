import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category creation with duplicate slug to validate uniqueness constraint.
 *
 * This test ensures the system prevents slug conflicts that would cause routing
 * issues in category filter URLs. The test creates an initial category, then
 * attempts to create another category with a different name but identical slug.
 * The API should reject the duplicate slug and return an error response
 * indicating the uniqueness violation, protecting URL routing integrity.
 *
 * Steps:
 *
 * 1. Authenticate as moderator for category management
 * 2. Create initial category with a specific slug
 * 3. Attempt to create second category with same slug but different name
 * 4. Verify the duplicate slug is rejected with an error
 */
export async function test_api_category_creation_duplicate_slug(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator for category management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "securePassword123",
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create initial category with a specific slug
  const sharedSlug = "economic-discussion";
  const firstCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: sharedSlug,
          description: "Discuss economic policies and market trends",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(firstCategory);

  // Validate the first category was created successfully
  TestValidator.equals(
    "first category slug matches",
    firstCategory.slug,
    sharedSlug,
  );

  // 3. Attempt to create second category with same slug but different name
  // 4. Verify the duplicate slug is rejected with an error
  await TestValidator.error("duplicate slug should be rejected", async () => {
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Financial Discussion",
          slug: sharedSlug,
          description: "Different category but same slug",
          sort_order: 2,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  });
}
