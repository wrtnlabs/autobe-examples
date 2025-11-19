import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReply";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function test_api_reply_creation_missing_content(
  connection: api.IConnection,
) {
  // Create a registered user
  const registeredUser: IDiscussionBoardRegisteredUser.IAuthorized =
    await api.functional.auth.registered_user.join(connection, {
      body: typia.random<IDiscussionBoardRegisteredUser.ICreate>(),
    });
  typia.assert(registeredUser);

  // Create a comment
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.registeredUser.comments.create(
      connection,
      {
        body: typia.random<IDiscussionBoardComment.ICreate>(),
      },
    );
  typia.assert(comment);

  // Attempt to create a reply with missing content
  await TestValidator.error(
    "should fail creating reply with missing content",
    async () =>
      await api.functional.discussionBoard.registeredUser.comments.replies.create(
        connection,
        {
          commentId: comment.id,
          body: null, // Missing content
        },
      ),
  );
}
