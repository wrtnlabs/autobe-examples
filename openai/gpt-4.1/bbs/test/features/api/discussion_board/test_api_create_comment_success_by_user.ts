import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that an authenticated user can successfully post a comment on an
 * existing article in the discussion board.
 *
 * 1. Register a new user and ensure authentication context is established.
 * 2. Create a new article as the comment target using the authenticated session.
 * 3. Generate valid comment body text respecting min/max length constraints.
 * 4. Submit a comment creation request targeting the created article.
 * 5. Assert:
 *
 *    - Response is a valid comment entity with all required fields.
 *    - The author of the comment matches the newly signed-in user.
 *    - The comment is attached to the created article.
 *    - Created_at is set and deleted_at is null.
 *    - The comment's body is correctly stored.
 */
export async function test_api_create_comment_success_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
    >(),
  } satisfies IDiscussionBoardUser.ICreate;
  const authorized = await api.functional.auth.user.join(connection, {
    body: userBody,
  });
  typia.assert(authorized);

  // 2. Create a new article under the authenticated user
  const articleBody = {
    title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 12,
    }) as string & tags.MaxLength<200>,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }) as string & tags.MaxLength<10000>,
  } satisfies IDiscussionBoardArticle.ICreate;
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    { body: articleBody },
  );
  typia.assert(article);

  // 3. Generate compliant comment body (min 1, max 5000 chars)
  const commentBodyContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 16,
  });
  const commentBody = {
    discussion_board_article_id: article.id,
    body: commentBodyContent,
  } satisfies IDiscussionBoardArticleComment.ICreate;

  // 4. Submit comment creation request
  const comment = await api.functional.discussionBoard.user.comments.create(
    connection,
    { body: commentBody },
  );
  typia.assert(comment);

  // 5. Assert comment response details
  TestValidator.equals(
    "comment body matches input",
    comment.body,
    commentBodyContent,
  );
  TestValidator.equals(
    "comment is attached to the created article",
    comment.article.id,
    article.id,
  );
  TestValidator.equals(
    "comment author matches user",
    comment.author.id,
    authorized.id,
  );
  TestValidator.predicate(
    "created_at is defined and is ISO string",
    typeof comment.created_at === "string" &&
      comment.created_at.length > 0 &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(comment.created_at),
  );
  TestValidator.equals("deleted_at is null", comment.deleted_at, null);
}
