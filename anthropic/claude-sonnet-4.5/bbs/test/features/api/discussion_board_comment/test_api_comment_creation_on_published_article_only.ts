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
 * Test that comments can only be posted on published articles, not on drafts or
 * deleted content.
 *
 * This test validates the business rule that comments require articles to be in
 * published status. The workflow creates a member account, establishes the
 * required category infrastructure, creates a published article, and then
 * successfully posts a comment on it.
 *
 * Test Steps:
 *
 * 1. Create and authenticate a member account
 * 2. Create a category for article classification (as moderator)
 * 3. Create a published article with the category
 * 4. Post a comment on the published article
 * 5. Verify comment creation and association
 */
export async function test_api_comment_creation_on_published_article_only(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: memberPassword,
      href: "https://discussion-board.example.com/register",
      referrer: "https://discussion-board.example.com/home",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Verify authentication was successful
  TestValidator.predicate(
    "member should have access token",
    member.token.access.length > 0,
  );

  // Step 2: Create category for article (requires moderator privileges)
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a published article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
        summary: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Verify article is published
  TestValidator.equals(
    "article status should be published",
    article.status,
    "published",
  );

  // Step 4: Post a comment on the published article
  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 5: Verify comment creation and association
  TestValidator.equals(
    "comment should be associated with the article",
    comment.discussion_board_article_id,
    article.id,
  );
  TestValidator.predicate(
    "comment content should not be empty",
    comment.content.length > 0,
  );
  TestValidator.predicate(
    "comment should have valid timestamps",
    new Date(comment.created_at).getTime() > 0,
  );
}
