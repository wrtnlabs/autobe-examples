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
 * Test updating a comment to maximum valid content length (5000 characters).
 *
 * This test validates boundary conditions for comment content updates by
 * creating a comment with normal content and then updating it to exactly 5000
 * characters, which is the maximum allowed length. The test ensures that the
 * system accepts the maximum length without truncation and properly stores and
 * retrieves the full content.
 *
 * Workflow:
 *
 * 1. Create new member account with authentication
 * 2. Create category for article organization
 * 3. Create and publish an article
 * 4. Post initial comment with normal content
 * 5. Update comment to exactly 5000 characters
 * 6. Validate update succeeds and content is complete
 */
export async function test_api_comment_update_with_maximum_length_content(
  connection: api.IConnection,
) {
  // Step 1: Create new member account
  const memberJoinData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinData });
  typia.assert(member);

  // Step 2: Create category for article organization
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 3: Create and publish an article
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

  // Step 4: Post initial comment with normal content
  const initialCommentData = {
    discussion_board_article_id: article.id,
    content: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: article.id,
      body: initialCommentData,
    });
  typia.assert(comment);

  // Step 5: Update comment to exactly 5000 characters (maximum boundary)
  const maxLengthContent = RandomGenerator.alphabets(5000);
  const updateData = {
    content: maxLengthContent,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: updateData,
      },
    );
  typia.assert(updatedComment);

  // Step 6: Validate the update is accepted and content is complete
  TestValidator.equals(
    "updated comment content matches maximum length",
    updatedComment.content,
    maxLengthContent,
  );

  TestValidator.equals(
    "updated comment content length is exactly 5000",
    updatedComment.content.length,
    5000,
  );

  TestValidator.predicate(
    "updated_at timestamp is modified",
    updatedComment.updated_at !== comment.updated_at,
  );

  TestValidator.equals(
    "comment ID remains unchanged",
    updatedComment.id,
    comment.id,
  );
}
