import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validates that attempting to soft-delete an already-deleted discussion board
 * comment yields an error.
 *
 * Steps:
 *
 * 1. Register a new user to act as the comment author via POST /auth/user/join.
 * 2. Create a new comment for a valid article (using a generated UUID for article
 *    ID) using POST /discussionBoard/user/comments.
 * 3. Perform the first deletion via DELETE
 *    /discussionBoard/user/comments/{commentId} and assert deleted_at is set.
 * 4. Attempt to delete again and confirm error response via TestValidator.error.
 */
export async function test_api_comment_soft_delete_double_delete_fails(
  connection: api.IConnection,
) {
  // 1. Register a new user (author)
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.MinLength<8> &
        tags.MaxLength<72> &
        tags.Format<"password">,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Create a new comment for a random article (simulate valid article context)
  // We'll use a fake article UUID because there is no article creation API given.
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.user.comments.create(
    connection,
    {
      body: {
        discussion_board_article_id: articleId,
        body: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 8,
          wordMax: 16,
        }) as string & tags.MinLength<1> & tags.MaxLength<5000>,
      } satisfies IDiscussionBoardArticleComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Soft-delete the comment
  const deletedComment =
    await api.functional.discussionBoard.user.comments.erase(connection, {
      commentId: comment.id,
    });
  typia.assert(deletedComment);
  TestValidator.predicate(
    "deleted_at timestamp is set after first delete",
    deletedComment.deleted_at !== null &&
      deletedComment.deleted_at !== undefined,
  );

  // 4. Try to soft-delete again, expect error
  await TestValidator.error(
    "second soft-delete of already deleted comment yields error",
    async () => {
      await api.functional.discussionBoard.user.comments.erase(connection, {
        commentId: comment.id,
      });
    },
  );
}
