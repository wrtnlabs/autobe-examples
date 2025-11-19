import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Attempt to update a discussion board comment that has been soft deleted
 * (deleted_at set).
 *
 * 1. Register a discussion board user (author of the comment)
 * 2. Create a new article as that user
 * 3. Post a comment on the new article
 * 4. Soft-delete the comment via the erase endpoint
 * 5. Attempt to update the now-deleted comment
 * 6. Expect a business rule validation error (editing is forbidden if deleted_at
 *    is set)
 */
export async function test_api_update_comment_failure_deleted(
  connection: api.IConnection,
) {
  // 1. Register a user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string &
    tags.MinLength<8> &
    tags.MaxLength<72> &
    tags.Format<"password"> = RandomGenerator.alphaNumeric(12);
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);

  // 2. Create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3. Create a comment
  const comment: IDiscussionBoardArticleComment =
    await api.functional.discussionBoard.user.comments.create(connection, {
      body: {
        discussion_board_article_id: article.id,
        body: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardArticleComment.ICreate,
    });
  typia.assert(comment);

  // 4. Soft-delete the comment
  const erased: IDiscussionBoardArticleComment =
    await api.functional.discussionBoard.user.comments.erase(connection, {
      commentId: comment.id,
    });
  typia.assert(erased);
  TestValidator.predicate(
    "comment.deleted_at set after erase",
    erased.deleted_at !== undefined && erased.deleted_at !== null,
  );

  // 5. Attempt to update the soft-deleted comment
  await TestValidator.error(
    "should forbid updating a soft-deleted comment",
    async () => {
      await api.functional.discussionBoard.user.comments.update(connection, {
        commentId: comment.id,
        body: {
          body: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardArticleComment.IUpdate,
      });
    },
  );
}
