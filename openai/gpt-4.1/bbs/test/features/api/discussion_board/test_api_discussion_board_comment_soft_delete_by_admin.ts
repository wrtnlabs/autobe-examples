import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate soft-deletion of a discussion board comment by an administrator.
 *
 * 1. Register an admin (obtain privileged authentication context).
 * 2. Attempt to soft-delete a random comment UUID (non-existent comment): must
 *    error.
 * 3. Attempt to soft-delete the same random comment again: must error
 *    (non-existent, still).
 *
 * Since there is no API to create a comment, this test only verifies the error
 * behavior for soft-deletion attempts on non-existent comments.
 */
export async function test_api_discussion_board_comment_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminOutput = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      href: "https://test.local/join",
      referrer: "https://test.local/landing",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminOutput);

  // 2. Attempt soft-delete with random (non-existent) commentId
  const fakeCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "soft delete on non-existent comment should error",
    async () => {
      await api.functional.discussionBoard.admin.comments.erase(connection, {
        commentId: fakeCommentId,
      });
    },
  );

  // 3. Attempt soft-delete on same random commentId again: still should error
  await TestValidator.error(
    "soft delete on already-non-existent comment should error",
    async () => {
      await api.functional.discussionBoard.admin.comments.erase(connection, {
        commentId: fakeCommentId,
      });
    },
  );
}
