import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that a registered user can update the content of their own comment under
 * a specific article.
 *
 * 1. Register userA and login (auth context will auto-change via returned token)
 * 2. Create an article as userA
 * 3. Post a comment as userA
 * 4. Update the comment content as userA (expect success)
 *
 *    - Verify content updated
 * 5. Register userB and login
 * 6. Attempt to update userA's comment as userB (expect error)
 * 7. Delete comment as userA (simulate soft-delete by updating deleted_at via
 *    backend if such endpoint allowed, but not provided here)
 *
 *    - Since no delete endpoint is available for comments in current API set, skip
 *         this test step
 * 8. (Lock tests for comments are skipped; not supported by available DTOs/e2e
 *    API)
 */
export async function test_api_user_comment_update_by_author(
  connection: api.IConnection,
) {
  // 1. Register userA
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = RandomGenerator.alphaNumeric(10);
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword as string &
        tags.MinLength<8> &
        tags.MaxLength<64>,
      display_name: RandomGenerator.name(),
      avatar_url: null,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userA);

  // 2. Create an article as userA
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 10,
        }) as string & tags.MinLength<1> & tags.MaxLength<100>,
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 10,
        }) as string & tags.MinLength<1> & tags.MaxLength<10000>,
        attachments: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 3. Post a comment as userA
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          body: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }) as string & tags.MinLength<1> & tags.MaxLength<1000>,
        } satisfies IDiscussionBoardArticleComment.ICreate,
      },
    );
  typia.assert(comment);

  // 4. Update the comment as userA (expect success)
  const updatedContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  }) as string & tags.MinLength<1> & tags.MaxLength<1000>;
  const updatedComment =
    await api.functional.discussionBoard.user.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          body: updatedContent,
        } satisfies IDiscussionBoardArticleComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  TestValidator.equals(
    "updated comment content is reflected",
    updatedComment.body,
    updatedContent,
  );
  TestValidator.equals(
    "comment author is userA",
    updatedComment.author.id,
    userA.id,
  );

  // 5. Register userB and login
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = RandomGenerator.alphaNumeric(10);
  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: userBPassword as string &
        tags.MinLength<8> &
        tags.MaxLength<64>,
      display_name: RandomGenerator.name(),
      avatar_url: null,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userB);

  // 6. Attempt to update userA's comment as userB (expect error)
  const forbiddenContent = RandomGenerator.paragraph({ sentences: 2 });
  await TestValidator.error(
    "non-author user cannot update comment",
    async () => {
      await api.functional.discussionBoard.user.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            body: forbiddenContent,
          } satisfies IDiscussionBoardArticleComment.IUpdate,
        },
      );
    },
  );
  // 7. Skipped: Unable to delete or lock a comment with the available API set
}
