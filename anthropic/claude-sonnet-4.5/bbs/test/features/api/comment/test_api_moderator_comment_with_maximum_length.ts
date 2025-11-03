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
 * Test moderator comment creation with maximum valid content length (5000
 * characters).
 *
 * This test validates that the discussion board system properly accepts and
 * stores comments at the upper boundary of the content length constraint. It
 * ensures that moderators can post long-form detailed responses up to the
 * maximum 5000 character limit without truncation or data loss.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account through join operation
 * 2. Create a category required for article creation
 * 3. Create an article as the moderator to provide a comment target
 * 4. Generate and post a comment with exactly 5000 characters
 * 5. Validate successful comment creation
 * 6. Verify full 5000 character content preservation
 */
export async function test_api_moderator_comment_with_maximum_length(
  connection: api.IConnection,
) {
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(15),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  const articleData = {
    title: RandomGenerator.name(5),
    body: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  const maxContentLength = 5000;
  const commentContent = RandomGenerator.alphabets(maxContentLength);

  TestValidator.equals(
    "generated comment content has exactly 5000 characters",
    commentContent.length,
    maxContentLength,
  );

  const commentData = {
    discussion_board_article_id: article.id,
    content: commentContent,
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  TestValidator.equals(
    "created comment content length is 5000 characters",
    comment.content.length,
    maxContentLength,
  );

  TestValidator.equals(
    "comment content is preserved exactly as submitted",
    comment.content,
    commentContent,
  );

  TestValidator.equals(
    "comment is associated with the correct article",
    comment.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "comment author type is moderator",
    comment.author_type,
    "moderator",
  );
}
