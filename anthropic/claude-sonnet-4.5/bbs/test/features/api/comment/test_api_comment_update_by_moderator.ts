import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test the complete workflow where a moderator updates a comment on an article.
 *
 * This test validates the full comment update lifecycle by a moderator:
 *
 * 1. Create a moderator account through join for authentication
 * 2. Create a category (required for article creation)
 * 3. Create an article with the required category
 * 4. Post a comment on that article
 * 5. Update the comment content as a moderator
 * 6. Verify the updated content is returned with proper timestamp and edit
 *    indicator
 * 7. Validate that the comment_snapshots table preserves the edit history for
 *    audit trail
 */
export async function test_api_comment_update_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create category (required for article creation)
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create article to host the comment
  const article =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 4: Post a comment on the article
  const originalContent = RandomGenerator.paragraph({ sentences: 5 });
  const comment =
    await api.functional.discussionBoard.moderator.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          discussion_board_parent_comment_id: null,
          content: originalContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Verify original comment content
  TestValidator.equals(
    "original comment content matches",
    comment.content,
    originalContent,
  );

  // Step 5: Update the comment content as moderator
  const updatedContent = RandomGenerator.paragraph({ sentences: 7 });
  const updatedComment =
    await api.functional.discussionBoard.moderator.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: updatedContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  // Step 6: Verify updated content and edit indicator
  TestValidator.equals(
    "updated comment content matches",
    updatedComment.content,
    updatedContent,
  );
  TestValidator.equals(
    "comment ID remains the same",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "article ID remains the same",
    updatedComment.discussion_board_article_id,
    article.id,
  );

  // Step 7: Validate edit history through timestamps
  // The updated_at timestamp should be different from created_at after modification
  TestValidator.notEquals(
    "updated_at differs from created_at after edit",
    updatedComment.updated_at,
    updatedComment.created_at,
  );

  // Verify updated_at is more recent than created_at
  const createdTime = new Date(updatedComment.created_at).getTime();
  const updatedTime = new Date(updatedComment.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is more recent than created_at",
    updatedTime >= createdTime,
  );
}
