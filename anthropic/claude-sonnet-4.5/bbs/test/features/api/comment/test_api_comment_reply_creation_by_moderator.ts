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
 * Test moderator creating a reply to an existing comment on an article.
 *
 * This test validates the complete workflow of a moderator participating in
 * threaded discussions by posting a reply to a top-level comment. It ensures
 * proper moderator attribution, parent comment relationship, and single-level
 * threading enforcement.
 *
 * Test workflow:
 *
 * 1. Create moderator account with authentication
 * 2. Create category for article organization
 * 3. Create article with the category
 * 4. Create parent top-level comment on the article
 * 5. Create reply to the parent comment (main test operation)
 * 6. Validate reply creation with proper metadata and relationships
 */
export async function test_api_comment_reply_creation_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create category
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 4: Create parent top-level comment
  const parentComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          discussion_board_parent_comment_id: null,
          content: RandomGenerator.paragraph({
            sentences: 15,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentComment);

  // Step 5: Create reply to the parent comment (main test operation)
  const reply: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.replies.create(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: {
          discussion_board_article_id: article.id,
          discussion_board_parent_comment_id: parentComment.id,
          content: RandomGenerator.paragraph({
            sentences: 12,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(reply);

  // Step 6: Validate reply creation
  TestValidator.equals(
    "reply article ID matches",
    reply.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "reply parent comment ID matches",
    reply.discussion_board_parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "reply author type is moderator",
    reply.author_type,
    "moderator",
  );

  // Handle nullable moderator ID with type assertion
  const replyModeratorId = typia.assert(reply.discussion_board_moderator_id!);
  TestValidator.equals(
    "reply moderator ID matches",
    replyModeratorId,
    moderator.id,
  );

  TestValidator.predicate(
    "reply has valid content length",
    reply.content.length >= 1 && reply.content.length <= 5000,
  );
  TestValidator.predicate(
    "reply has created timestamp",
    reply.created_at !== null && reply.created_at !== undefined,
  );
  TestValidator.predicate(
    "reply has updated timestamp",
    reply.updated_at !== null && reply.updated_at !== undefined,
  );
  TestValidator.predicate("reply is not deleted", reply.deleted_at === null);
}
