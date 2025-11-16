import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validates that an authenticated user can soft delete their own comment on a
 * discussion board article, enforcing correct authentication context and soft
 * deletion flagging.
 *
 * Steps:
 *
 * 1. Register a new user and obtain authentication.
 * 2. Create a new discussion board article as this user.
 * 3. Create a comment on the article using this user's session.
 * 4. Perform a soft delete (erase) of the comment as the comment owner.
 * 5. Validate that the returned comment response object has a non-null, correctly
 *    formatted deleted_at timestamp, and that the object has not been fully
 *    removed (still present, with deleted_at now set).
 */
export async function test_api_discussion_board_comment_soft_delete_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user and obtain authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const joinInput = {
    email: userEmail,
    password: userPassword,
    href: "https://test-discussion.example.com/register",
    referrer: "https://test-discussion.example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardUser.ICreate;
  const registration = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(registration);
  // Token is now applied to connection by SDK

  // 2. Create a new article as this user
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 6, wordMax: 12 }), // 5-150 chars
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 5,
      wordMax: 12,
    }), // 20-5000 chars
  } satisfies IDiscussionBoardArticle.ICreate;
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    { body: articleBody },
  );
  typia.assert(article);

  // 3. Create a comment as this user
  const commentBody = {
    discussion_board_article_id: article.id,
    body: RandomGenerator.paragraph({ sentences: 3, wordMin: 10, wordMax: 20 }), // 2-1000 chars
    // attachments omitted for simplicity
  } satisfies IDiscussionBoardComment.ICreate;
  const comment = await api.functional.discussionBoard.user.comments.create(
    connection,
    { body: commentBody },
  );
  typia.assert(comment);
  TestValidator.equals(
    "comment initially not deleted",
    comment.deleted_at,
    null,
  );

  // 4. Soft delete the comment as its owner
  const deleted = await api.functional.discussionBoard.user.comments.erase(
    connection,
    { commentId: comment.id },
  );
  typia.assert(deleted);
  TestValidator.notEquals(
    "deleted_at is now set after soft delete",
    deleted.deleted_at,
    null,
  );
  TestValidator.equals(
    "deleted comment id matches original comment",
    deleted.id,
    comment.id,
  );
  TestValidator.equals(
    "deleted comment article matches original linked article",
    deleted.article.id,
    article.id,
  );
  TestValidator.notEquals(
    "deleted_at timestamp is different from none",
    deleted.deleted_at,
    undefined,
  );
  TestValidator.predicate(
    "deleted_at is ISO 8601 string",
    !!deleted.deleted_at &&
      typeof deleted.deleted_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(deleted.deleted_at),
  );
}
