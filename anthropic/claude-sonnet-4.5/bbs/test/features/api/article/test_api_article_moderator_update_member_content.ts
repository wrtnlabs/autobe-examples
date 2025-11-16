import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator updating a member-created article for content moderation.
 *
 * This test validates the complete workflow where a moderator exercises their
 * elevated privileges to update an article originally created by a member. This
 * is a critical content moderation capability that allows moderators to edit
 * any user's content for quality control, policy enforcement, or community
 * standards maintenance.
 *
 * Workflow steps:
 *
 * 1. Create and authenticate a member account
 * 2. Member creates an article with initial title and body content
 * 3. Create and authenticate a moderator account (switching user context)
 * 4. Moderator updates the article's title and body content
 * 5. Verify the article is successfully updated with new content
 * 6. Confirm updated_at timestamp is refreshed while created_at remains unchanged
 * 7. Verify author information remains pointing to original member (immutable)
 * 8. Validate system metadata (id, view_count) remains unchanged
 */
export async function test_api_article_moderator_update_member_content(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "memberPass123";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Member creates an article with initial content
  const initialTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const initialBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: initialTitle,
        body: initialBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Store original article data for validation
  const originalArticleId = article.id;
  const originalCreatedAt = article.created_at;
  const originalAuthorId = article.author.id;
  const originalViewCount = article.view_count;

  // Step 3: Create and authenticate moderator account (switching user context)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "modPass123";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Moderator updates the article's content
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedBody = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 15,
    sentenceMax: 25,
  });

  const updatedArticle =
    await api.functional.discussionBoard.moderator.articles.update(connection, {
      articleId: article.id,
      body: {
        title: updatedTitle,
        body: updatedBody,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 5: Verify the article is successfully updated with new content
  TestValidator.equals(
    "updated article title matches new content",
    updatedArticle.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated article body matches new content",
    updatedArticle.body,
    updatedBody,
  );

  // Step 6: Confirm immutable fields remain unchanged
  TestValidator.equals(
    "article ID remains unchanged",
    updatedArticle.id,
    originalArticleId,
  );
  TestValidator.equals(
    "article created_at remains unchanged",
    updatedArticle.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "article view_count remains unchanged",
    updatedArticle.view_count,
    originalViewCount,
  );

  // Step 7: Verify author information remains pointing to original member (immutable)
  TestValidator.equals(
    "article author ID remains pointing to original member",
    updatedArticle.author.id,
    originalAuthorId,
  );
  TestValidator.equals(
    "article author ID matches member ID",
    updatedArticle.author.id,
    member.id,
  );

  // Step 8: Verify updated_at timestamp was refreshed
  TestValidator.predicate(
    "updated_at timestamp is after created_at",
    new Date(updatedArticle.updated_at).getTime() >=
      new Date(updatedArticle.created_at).getTime(),
  );

  // Step 9: Validate updated content meets constraints
  TestValidator.predicate(
    "updated title length is within constraints",
    updatedArticle.title.length >= 5 && updatedArticle.title.length <= 200,
  );
  TestValidator.predicate(
    "updated body length is within constraints",
    updatedArticle.body.length >= 10 && updatedArticle.body.length <= 50000,
  );
}
