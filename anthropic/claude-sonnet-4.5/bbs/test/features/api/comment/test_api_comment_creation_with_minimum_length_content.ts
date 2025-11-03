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
 * Test comment creation with minimum valid content length (1 character).
 *
 * This test validates the minimum boundary condition for comment content by
 * creating a comment with exactly 1 character. The system should accept this as
 * valid input according to the IDiscussionBoardComment.ICreate schema which
 * specifies content must be between 1 and 5000 characters (MinLength<1> &
 * MaxLength<5000>).
 *
 * Workflow:
 *
 * 1. Create and authenticate a new member account
 * 2. Create a category for article organization
 * 3. Create and publish an article
 * 4. Post a comment with exactly 1 character content
 * 5. Validate the comment is accepted and created successfully
 */
export async function test_api_comment_creation_with_minimum_length_content(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate new member account
  const memberCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const authenticatedMember = await api.functional.auth.member.join(
    connection,
    {
      body: memberCredentials,
    },
  );
  typia.assert(authenticatedMember);

  // Step 2: Create category for article (requires moderator authentication)
  const categoryData = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create article to receive the comment
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 1 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 4: Create comment with exactly 1 character (minimum boundary test)
  const minLengthContent = "a";
  const commentData = {
    discussion_board_article_id: article.id,
    discussion_board_parent_comment_id: null,
    content: minLengthContent,
  } satisfies IDiscussionBoardComment.ICreate;

  const comment = await api.functional.discussionBoard.articles.comments.create(
    connection,
    {
      articleId: article.id,
      body: commentData,
    },
  );
  typia.assert(comment);

  // Step 5: Validate the comment was created successfully
  TestValidator.equals(
    "comment content matches minimum length input",
    comment.content,
    minLengthContent,
  );
  TestValidator.equals(
    "comment is associated with correct article",
    comment.discussion_board_article_id,
    article.id,
  );
}
