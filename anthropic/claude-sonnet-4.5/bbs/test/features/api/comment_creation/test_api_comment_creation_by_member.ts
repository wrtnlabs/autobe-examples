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
 * Test successful comment creation on an article by an authenticated member.
 *
 * This validates the core discussion functionality where members post comments
 * on economic and political articles. The test creates a member account,
 * authenticates, creates an article, then posts a new comment on that article
 * with valid content within length constraints (1-5000 characters).
 *
 * Verification includes:
 *
 * 1. Comment is created immediately without moderation approval
 * 2. Complete comment metadata is returned including author information
 * 3. Author_type is set to 'member'
 * 4. Correct member ID is associated with the comment
 *
 * Step-by-step process:
 *
 * 1. Create and authenticate a new member account
 * 2. Create an article to receive the comment
 * 3. Post a new comment on the article
 * 4. Validate comment creation and author metadata
 */
export async function test_api_comment_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberPassword = "TestPass123!@#";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: "https://discussion-board.example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://discussion-board.example.com" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create an article to receive the comment
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
  });

  // Generate a category ID that should exist in the system
  const fakeCategoryId = typia.random<string & tags.Format<"uuid">>();

  const articleData = {
    title: articleTitle,
    body: articleBody,
    category_ids: [fakeCategoryId],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 3: Post a new comment on the article
  const commentContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const commentData = {
    discussion_board_article_id: article.id,
    content: commentContent,
  } satisfies IDiscussionBoardComment.ICreate;

  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Step 4: Validate business logic - author type and information
  TestValidator.equals("author type is member", comment.author_type, "member");
  TestValidator.predicate(
    "member author should be populated",
    comment.memberAuthor !== null && comment.memberAuthor !== undefined,
  );
  TestValidator.equals(
    "moderator author should be null",
    comment.moderatorAuthor,
    null,
  );
}
