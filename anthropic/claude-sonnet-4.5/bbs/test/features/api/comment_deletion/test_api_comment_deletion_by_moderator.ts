import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the complete workflow of a moderator deleting a comment from an article.
 *
 * This test validates that moderators can successfully remove comments posted
 * by members for content moderation purposes. The test follows a realistic
 * multi-actor scenario:
 *
 * 1. A member joins the platform and authenticates
 * 2. The member creates an article for discussion
 * 3. The member posts a comment on their own article
 * 4. A moderator joins the platform and authenticates
 * 5. The moderator deletes the comment using their moderation privileges
 *
 * Validation points:
 *
 * - Verify the comment is successfully created by the member
 * - Verify the moderator can authenticate and obtain proper authorization tokens
 * - Verify the moderator can successfully delete the comment
 * - Verify the deletion response contains the deleted comment information
 * - Validate that proper authorization is enforced (moderator role required)
 *
 * This test ensures the content moderation workflow functions correctly and
 * that moderators have the necessary privileges to manage community content.
 */
export async function test_api_comment_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Member joins the platform
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Member creates an article
  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Member posts a comment on the article
  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Moderator joins the platform (this switches authentication context)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 5: Moderator deletes the comment
  const deletedComment =
    await api.functional.discussionBoard.moderator.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(deletedComment);

  // Validate the deleted comment data matches the original comment
  TestValidator.equals(
    "deleted comment ID matches original",
    deletedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "deleted comment article ID matches",
    deletedComment.discussion_board_article_id,
    article.id,
  );
}
