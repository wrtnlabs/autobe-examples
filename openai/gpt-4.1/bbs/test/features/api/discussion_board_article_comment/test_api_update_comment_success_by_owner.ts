import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validates that the comment's original author can update their own comment.
 *
 * 1. Register and authenticate a user (join endpoint).
 * 2. Create a discussion article as the authenticated user.
 * 3. Post a comment as that user to establish authorship/ownership.
 * 4. Attempt to update the comment with a new body (valid, under 5,000 chars).
 * 5. Confirm system updates the comment's text, refreshes updated_at, and returns
 *    a valid response structure.
 * 6. Assert that the author has not changed, and that updated_at is newer than
 *    created_at. Validate the entire response type and logic.
 */
export async function test_api_update_comment_success_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user and obtain authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const joinRes: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword satisfies string &
          tags.MinLength<8> &
          tags.MaxLength<72> &
          tags.Format<"password">,
      },
    });
  typia.assert(joinRes);
  const userId = joinRes.id;

  // 2. Create an article as this user
  const articleRes: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 12,
        }) satisfies string & tags.MaxLength<200>,
        content: RandomGenerator.paragraph({
          sentences: 15,
          wordMin: 5,
          wordMax: 10,
        }) satisfies string & tags.MaxLength<10000>,
      },
    });
  typia.assert(articleRes);
  const articleId = articleRes.id;

  // 3. Post a comment as the same user
  const originalCommentBody = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 12,
  });
  const commentRes: IDiscussionBoardArticleComment =
    await api.functional.discussionBoard.user.comments.create(connection, {
      body: {
        discussion_board_article_id: articleId,
        body: originalCommentBody satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<5000>,
      },
    });
  typia.assert(commentRes);
  const commentId = commentRes.id;

  // 4. Update the comment as the owner, providing valid body text < 5000 chars
  const updatedCommentBody = RandomGenerator.paragraph({
    sentences: 7,
    wordMin: 7,
    wordMax: 15,
  });
  const updateRes: IDiscussionBoardArticleComment =
    await api.functional.discussionBoard.user.comments.update(connection, {
      commentId,
      body: {
        body: updatedCommentBody satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<5000>,
      },
    });
  typia.assert(updateRes);

  // 5. Assertion: updated response body matches, updated_at has changed, author is unchanged
  TestValidator.equals("comment id is unchanged", updateRes.id, commentId);
  TestValidator.equals("author is unchanged", updateRes.author.id, userId);
  TestValidator.equals(
    "article id is unchanged",
    updateRes.article.id,
    articleId,
  );
  TestValidator.equals("updated body", updateRes.body, updatedCommentBody);
  TestValidator.predicate(
    "updated_at reflects newer timestamp than created_at",
    () =>
      new Date(updateRes.updated_at).getTime() >
      new Date(updateRes.created_at).getTime(),
  );
}
