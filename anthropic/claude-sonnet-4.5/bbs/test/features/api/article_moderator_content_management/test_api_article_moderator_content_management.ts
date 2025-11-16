import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator's content management through soft deletion of member articles.
 *
 * This test validates the complete content moderation workflow where moderators
 * can manage (soft delete) articles created by members while preserving audit
 * trails.
 *
 * Test Flow:
 *
 * 1. Create and authenticate as a member
 * 2. Member creates a political discussion article
 * 3. Create and authenticate as a moderator
 * 4. Moderator soft-deletes the member's article
 * 5. Validate soft deletion preserves all data with deleted_at timestamp
 */
export async function test_api_article_moderator_content_management(
  connection: api.IConnection,
) {
  // Step 1: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member_password_123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://discussion-board.example.com/join",
      referrer: "https://discussion-board.example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Member creates a political discussion article
  const articleTitle =
    "Analysis of Current Economic Policy and Political Implications";
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 5,
    wordMax: 10,
  });

  const createdArticle = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: articleTitle,
        body: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(createdArticle);

  // Validate article was created successfully
  TestValidator.equals(
    "article title matches",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article body matches",
    createdArticle.body,
    articleBody,
  );
  TestValidator.equals(
    "article author is member",
    createdArticle.author.id,
    member.id,
  );
  TestValidator.equals(
    "initial view count is zero",
    createdArticle.view_count,
    0,
  );
  TestValidator.equals(
    "article not deleted initially",
    createdArticle.deleted_at,
    null,
  );

  // Step 3: Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_password_456";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://discussion-board.example.com/moderator/join",
      referrer: "https://discussion-board.example.com/moderator",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Moderator soft-deletes the member's article
  const deletedArticle =
    await api.functional.discussionBoard.moderator.articles.erase(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(deletedArticle);

  // Step 5: Validate soft deletion behavior
  TestValidator.equals(
    "deleted article ID matches",
    deletedArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "deleted article title preserved",
    deletedArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "deleted article body preserved",
    deletedArticle.body,
    articleBody,
  );
  TestValidator.equals(
    "deleted article view count preserved",
    deletedArticle.view_count,
    createdArticle.view_count,
  );
  TestValidator.equals(
    "deleted article author preserved",
    deletedArticle.author.id,
    member.id,
  );
  TestValidator.equals(
    "deleted article created_at preserved",
    deletedArticle.created_at,
    createdArticle.created_at,
  );
  TestValidator.equals(
    "deleted article updated_at preserved",
    deletedArticle.updated_at,
    createdArticle.updated_at,
  );

  // Critical validation: deleted_at timestamp is set (not null)
  TestValidator.predicate(
    "deleted_at timestamp is set after soft deletion",
    deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );
}
