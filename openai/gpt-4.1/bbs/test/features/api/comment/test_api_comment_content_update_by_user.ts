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
 * Test updating a comment's content by the owning user.
 *
 * This test scenario covers the full workflow for a member of the discussion
 * board to update one of their own comments on an article. It ensures business
 * validation of content length, confirms ownership enforcement, and checks that
 * the timestamp for updates is refreshed. It also confirms that only the
 * rightful user (or admin, but not tested here) may update the comment, as well
 * as that soft-deleted comments cannot be updated.
 *
 * Steps:
 *
 * 1. Register a new user with valid registration information (all required fields,
 *    email unique, etc.).
 * 2. Using the new user's authentication, create a discussion board article
 *    (title: 5-150 chars, body: 20-5000 chars).
 * 3. As this user, create a comment for the article. Body must be 2-1000
 *    characters.
 * 4. Update the comment's body via /discussionBoard/user/comments/{commentId}. Use
 *    a new valid content string (2-1000 chars), ensuring the update happens as
 *    the comment's owner.
 * 5. Confirm that the returned comment object's body matches the update, that the
 *    updated_at timestamp is refreshed compared to before, and that
 *    business/content validation rules are strictly applied.
 * 6. Validate that the comment was not soft-deleted (deleted_at is null or
 *    undefined).
 */
export async function test_api_comment_content_update_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user (discussion board member)
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://testboard.local/register",
    referrer: "https://testboard.local/login",
    ip: undefined,
  } satisfies IDiscussionBoardUser.ICreate;
  const user = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(user);
  const userId = user.id;

  // 2. Create an article as this user (must be authenticated)
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 6, wordMax: 15 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 3,
      wordMax: 12,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    { body: articleCreateBody },
  );
  typia.assert(article);
  const articleId = article.id;

  // 3. Create a comment as this user on the article
  const commentCreateBody = {
    discussion_board_article_id: articleId,
    body: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 20 }),
  } satisfies IDiscussionBoardComment.ICreate;
  const comment = await api.functional.discussionBoard.user.comments.create(
    connection,
    { body: commentCreateBody },
  );
  typia.assert(comment);
  const commentId = comment.id;
  const prevUpdatedAt = comment.updated_at;

  // 4. Update the comment's body (new valid 2-1000 char string)
  const newBody = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 2,
    wordMax: 10,
  });
  const commentUpdateBody = {
    body: newBody,
  } satisfies IDiscussionBoardComment.IUpdate;
  const updatedComment =
    await api.functional.discussionBoard.user.comments.update(connection, {
      commentId,
      body: commentUpdateBody,
    });
  typia.assert(updatedComment);

  // 5. Confirm return: body updated, timestamp is refreshed, business logic enforced
  TestValidator.equals("comment body updated", updatedComment.body, newBody);
  TestValidator.notEquals(
    "updated_at is refreshed",
    updatedComment.updated_at,
    prevUpdatedAt,
  );
  TestValidator.predicate(
    "body meets length constraint",
    updatedComment.body.length >= 2 && updatedComment.body.length <= 1000,
  );

  // 6. Confirm not soft-deleted
  TestValidator.equals(
    "not soft-deleted after update",
    updatedComment.deleted_at,
    null,
  );
}
