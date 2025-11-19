import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test deletion of multiple unused categories in sequence.
 *
 * This test validates that the category deletion operation works consistently
 * across multiple categories and that each category can be independently
 * removed when not in use by articles.
 *
 * Test Flow:
 *
 * 1. Authenticate as moderator with category management privileges
 * 2. Create three distinct categories with different names and slugs
 * 3. Delete the first category and verify success
 * 4. Delete the second category and verify success
 * 5. Delete the third category and verify success
 */
export async function test_api_category_deletion_multiple_unused(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create three categories with different names and slugs
  const category1 =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Technology Discussion",
          slug: "technology-discussion",
          description: "Discussions about technology, software, and innovation",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category1);

  const category2 =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Science Discussion",
          slug: "science-discussion",
          description: "Discussions about scientific discoveries and research",
          sort_order: 2,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category2);

  const category3 =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Culture Discussion",
          slug: "culture-discussion",
          description: "Discussions about culture, arts, and society",
          sort_order: 3,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category3);

  // Step 3: Delete the first category and verify success
  await api.functional.discussionBoard.moderator.categories.erase(connection, {
    categoryId: category1.id,
  });

  // Step 4: Delete the second category and verify success
  await api.functional.discussionBoard.moderator.categories.erase(connection, {
    categoryId: category2.id,
  });

  // Step 5: Delete the third category and verify success
  await api.functional.discussionBoard.moderator.categories.erase(connection, {
    categoryId: category3.id,
  });
}
