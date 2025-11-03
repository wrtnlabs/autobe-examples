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
 * Test that moderators can post multiple replies rapidly without rate limiting.
 *
 * This test validates that moderators have elevated privileges exempting them
 * from rate limiting restrictions that apply to regular members. Moderators
 * must be able to post multiple replies in quick succession to efficiently
 * manage community discussions and respond to multiple comments without being
 * blocked by spam prevention mechanisms.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a category for article organization
 * 3. Create an article to hold the comment discussions
 * 4. Create multiple top-level comments to establish different conversation
 *    threads
 * 5. Rapidly post replies to different comments without delays
 * 6. Verify all replies succeed without rate limit errors
 */
export async function test_api_moderator_reply_without_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
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

  // Step 2: Create a category for the article
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

  // Step 3: Create an article where comments will be posted
  const article =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 4: Create multiple top-level comments for different conversation threads
  const commentCount = 5;
  const comments = await ArrayUtil.asyncRepeat(commentCount, async (index) => {
    const comment =
      await api.functional.discussionBoard.moderator.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            discussion_board_article_id: article.id,
            content: `Top-level comment ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    return comment;
  });

  // Step 5: Rapidly post replies to different comments without delays
  // This is the critical test - moderators should not be rate limited
  const replies = await ArrayUtil.asyncRepeat(commentCount, async (index) => {
    const reply =
      await api.functional.discussionBoard.moderator.articles.comments.replies.create(
        connection,
        {
          articleId: article.id,
          commentId: comments[index].id,
          body: {
            discussion_board_article_id: article.id,
            discussion_board_parent_comment_id: comments[index].id,
            content: `Reply to comment ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(reply);
    return reply;
  });

  // Step 6: Verify all replies were successfully created
  TestValidator.equals("all replies created", replies.length, commentCount);

  // Verify each reply has correct parent comment reference
  replies.forEach((reply, index) => {
    TestValidator.equals(
      `reply ${index + 1} has correct parent`,
      reply.discussion_board_parent_comment_id,
      comments[index].id,
    );
  });
}
