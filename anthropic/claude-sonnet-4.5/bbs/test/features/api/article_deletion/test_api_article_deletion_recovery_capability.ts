import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test soft deletion of discussion board articles.
 *
 * This test validates that articles can be soft deleted through the delete
 * endpoint. Due to API limitations (no update/restore or retrieval endpoints
 * available), this test can only verify:
 *
 * 1. Articles are created successfully without deleted_at timestamp
 * 2. The delete endpoint executes without error
 *
 * Note: Complete soft deletion verification would require:
 *
 * - A GET endpoint to retrieve articles and verify deleted_at is set
 * - An UPDATE endpoint to clear deleted_at for restoration
 * - A LIST endpoint to verify deleted articles are hidden from public view These
 *   endpoints are not available in the current API materials.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a member account
 * 3. Create a category required for article creation
 * 4. Create an article as a moderator
 * 5. Verify article was created without deleted_at
 * 6. Execute soft delete operation on the article
 */
export async function test_api_article_deletion_recovery_capability(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "A1!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "A1!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 3: Create category required for article
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create article as moderator
  const article =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Verify article was created without deleted_at timestamp
  TestValidator.equals(
    "article initially has no deleted_at timestamp",
    article.deleted_at,
    null,
  );

  // Step 6: Execute soft delete operation
  await api.functional.discussionBoard.moderator.articles.erase(connection, {
    articleId: article.id,
  });

  // Test complete - deletion executed successfully
  // Full verification of deleted_at state and restoration cannot be performed
  // without additional API endpoints (GET for retrieval, PUT/PATCH for restoration)
}
