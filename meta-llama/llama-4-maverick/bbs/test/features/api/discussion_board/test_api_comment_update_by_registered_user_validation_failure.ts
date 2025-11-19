import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function test_api_comment_update_by_registered_user_validation_failure(
  connection: api.IConnection,
) {
  // Create a new registered user account
  const user: IDiscussionBoardRegisteredUser.IAuthorized =
    await api.functional.auth.registered_user.join(connection, {
      body: typia.random<IDiscussionBoardRegisteredUser.ICreate>(),
    });
  typia.assert(user);

  // Create a new comment
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.registeredUser.comments.create(
      connection,
      {
        body: typia.random<IDiscussionBoardComment.ICreate>(),
      },
    );
  typia.assert(comment);

  // Attempt to update the comment with invalid data (empty content)
  await TestValidator.error("should fail with empty content", async () => {
    await api.functional.discussionBoard.registeredUser.comments.update(
      connection,
      {
        commentId: comment.id,
        body: { content: "" } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  });
}
