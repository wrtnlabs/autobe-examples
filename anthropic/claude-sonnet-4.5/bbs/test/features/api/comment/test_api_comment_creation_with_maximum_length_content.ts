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
 * Test comment creation with maximum valid content length (5000 characters).
 *
 * This test validates that the discussion board system correctly accepts
 * comments with exactly 5000 characters, which is the maximum boundary value
 * according to the IDiscussionBoardComment.ICreate schema. The test ensures
 * that maximum-length comments are accepted without truncation and stored
 * completely.
 *
 * Workflow:
 *
 * 1. Create a category for article organization (requires existing moderator
 *    setup)
 * 2. Create new member account and authenticate
 * 3. Create and publish an article to receive the comment
 * 4. Generate exactly 5000 characters of content
 * 5. Post a comment with the maximum-length content
 * 6. Validate successful creation and complete content storage
 */
export async function test_api_comment_creation_with_maximum_length_content(
  connection: api.IConnection,
) {
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  const memberJoinData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinData,
    });
  typia.assert(member);

  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  const maxLengthContent = RandomGenerator.alphabets(5000);

  const commentData = {
    discussion_board_article_id: article.id,
    content: maxLengthContent,
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: article.id,
      body: commentData,
    });
  typia.assert(comment);

  TestValidator.equals(
    "comment content length is 5000",
    comment.content.length,
    5000,
  );
  TestValidator.equals(
    "comment content matches input",
    comment.content,
    maxLengthContent,
  );
  TestValidator.equals(
    "comment article ID matches",
    comment.discussion_board_article_id,
    article.id,
  );
}
