import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Verify that a user cannot soft-delete (erase) a comment they do not own.
 *
 * This test ensures that the permission system prohibits users from deleting
 * comments authored by others. It will:
 *
 * 1. Register User A (the comment owner)
 * 2. As User A, create a comment for a random (synthetic) article id
 * 3. Register User B (different user)
 * 4. Switch session to User B
 * 5. As User B, attempt to soft-delete the comment written by User A. Expect the
 *    operation to fail with an authorization error.
 *
 * This test focuses on validating entity-level access control for comment
 * deletion, ensuring ownership is respected.
 */
export async function test_api_comment_soft_delete_user_not_owner_fails(
  connection: api.IConnection,
) {
  // 1. Register first user (User A)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
  >();
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userA);

  // 2. As User A, create a comment (requires a random (synthetic) article id)
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const commentBody = RandomGenerator.paragraph({ sentences: 5 });
  const comment = await api.functional.discussionBoard.user.comments.create(
    connection,
    {
      body: {
        discussion_board_article_id: articleId,
        body: commentBody,
      } satisfies IDiscussionBoardArticleComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Register second user (User B)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
  >();
  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userB);

  // 4. As User B (now authenticated - the SDK handles switching via join above), try to soft-delete User A's comment
  await TestValidator.error(
    "user should not be able to delete a comment they do not own",
    async () => {
      await api.functional.discussionBoard.user.comments.erase(connection, {
        commentId: comment.id,
      });
    },
  );
}
