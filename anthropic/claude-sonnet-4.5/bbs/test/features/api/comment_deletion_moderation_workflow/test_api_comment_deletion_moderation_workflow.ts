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
 * Test moderator's ability to delete inappropriate or spam comments posted by
 * different members across multiple articles.
 *
 * This test validates the moderation workflow for handling community standards
 * violations by ensuring moderators can effectively manage content across the
 * entire discussion board platform.
 *
 * Workflow:
 *
 * 1. First member joins and creates an article with a comment
 * 2. Second member joins and creates another article with a comment
 * 3. Moderator joins the platform
 * 4. Moderator deletes the first member's comment
 * 5. Moderator deletes the second member's comment
 *
 * Validation points:
 *
 * - Verify moderator can delete comments from different members
 * - Verify moderator can delete comments across different articles
 * - Verify each deletion returns proper comment information
 * - Validate that the moderator has broad content moderation capabilities
 * - Ensure proper authorization throughout the workflow
 */
export async function test_api_comment_deletion_moderation_workflow(
  connection: api.IConnection,
) {
  // Step 1: First member joins
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = "SecurePassword123!";
  const member1Body = {
    email: member1Email,
    password: member1Password,
    username: RandomGenerator.name(2),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const member1 = await api.functional.auth.member.join(connection, {
    body: member1Body,
  });
  typia.assert(member1);

  // Step 2: First member creates an article
  const article1Body = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article1 = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: article1Body,
    },
  );
  typia.assert(article1);

  // Step 3: First member creates a comment on their article
  const comment1Body = {
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment1 =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article1.id,
        body: comment1Body,
      },
    );
  typia.assert(comment1);

  // Step 4: Second member joins
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = "AnotherSecurePass456!";
  const member2Body = {
    email: member2Email,
    password: member2Password,
    username: RandomGenerator.name(2),
    href: "https://example.com/join",
    referrer: "https://example.com/discover",
  } satisfies IDiscussionBoardMember.ICreate;

  const member2 = await api.functional.auth.member.join(connection, {
    body: member2Body,
  });
  typia.assert(member2);

  // Step 5: Second member creates an article
  const article2Body = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article2 = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: article2Body,
    },
  );
  typia.assert(article2);

  // Step 6: Second member creates a comment on their article
  const comment2Body = {
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment2 =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article2.id,
        body: comment2Body,
      },
    );
  typia.assert(comment2);

  // Step 7: Moderator joins
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorSecure789!";
  const moderatorBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: RandomGenerator.name(2),
    href: "https://example.com/moderator/join",
    referrer: "https://example.com/admin",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorBody,
  });
  typia.assert(moderator);

  // Step 8: Moderator deletes the first member's comment
  const deletedComment1 =
    await api.functional.discussionBoard.moderator.articles.comments.erase(
      connection,
      {
        articleId: article1.id,
        commentId: comment1.id,
      },
    );
  typia.assert(deletedComment1);

  // Validate the deleted comment matches the original comment
  TestValidator.equals(
    "deleted comment 1 ID matches",
    deletedComment1.id,
    comment1.id,
  );
  TestValidator.equals(
    "deleted comment 1 content matches",
    deletedComment1.content,
    comment1.content,
  );
  TestValidator.equals(
    "deleted comment 1 article ID matches",
    deletedComment1.discussion_board_article_id,
    article1.id,
  );
  TestValidator.equals(
    "deleted comment 1 member ID matches",
    deletedComment1.member_id,
    member1.id,
  );

  // Step 9: Moderator deletes the second member's comment
  const deletedComment2 =
    await api.functional.discussionBoard.moderator.articles.comments.erase(
      connection,
      {
        articleId: article2.id,
        commentId: comment2.id,
      },
    );
  typia.assert(deletedComment2);

  // Validate the deleted comment matches the original comment
  TestValidator.equals(
    "deleted comment 2 ID matches",
    deletedComment2.id,
    comment2.id,
  );
  TestValidator.equals(
    "deleted comment 2 content matches",
    deletedComment2.content,
    comment2.content,
  );
  TestValidator.equals(
    "deleted comment 2 article ID matches",
    deletedComment2.discussion_board_article_id,
    article2.id,
  );
  TestValidator.equals(
    "deleted comment 2 member ID matches",
    deletedComment2.member_id,
    member2.id,
  );

  // Validate cross-article and cross-member moderation capability
  TestValidator.predicate(
    "moderator deleted comments from different articles",
    deletedComment1.discussion_board_article_id !==
      deletedComment2.discussion_board_article_id,
  );
  TestValidator.predicate(
    "moderator deleted comments from different members",
    deletedComment1.member_id !== deletedComment2.member_id,
  );
}
