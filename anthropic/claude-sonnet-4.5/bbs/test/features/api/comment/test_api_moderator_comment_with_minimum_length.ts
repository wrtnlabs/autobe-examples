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
 * Test moderator comment creation with minimum valid content length.
 *
 * This test validates the lower boundary of the comment content validation by
 * creating a comment with exactly 1 character of content. The test ensures that
 * the system correctly accepts single-character comments as valid input and
 * preserves the content without modification.
 *
 * Test workflow:
 *
 * 1. Register a new moderator account
 * 2. Create a category for organizing the article
 * 3. Create an article under the created category
 * 4. Post a comment with exactly 1 character content (minimum valid length)
 * 5. Validate the comment was created successfully
 * 6. Verify the single character content is preserved correctly
 */
export async function test_api_moderator_comment_with_minimum_length(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "A1!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorBody,
  });
  typia.assert(moderator);

  // Step 2: Create a category for article creation
  const categoryBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Step 3: Create an article as a moderator
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // Step 4: Post a comment with exactly 1 character content (minimum valid length)
  const commentBody = {
    discussion_board_article_id: article.id,
    content: "A",
  } satisfies IDiscussionBoardComment.ICreate;

  const comment =
    await api.functional.discussionBoard.moderator.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // Step 5: Validate the comment is accepted and created successfully
  TestValidator.equals("comment content matches", comment.content, "A");
  TestValidator.equals(
    "comment article ID matches",
    comment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment author type is moderator",
    comment.author_type,
    "moderator",
  );
}
