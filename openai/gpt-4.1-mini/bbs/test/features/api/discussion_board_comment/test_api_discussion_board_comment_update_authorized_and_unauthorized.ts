import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_discussion_board_comment_update_authorized_and_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful comment update by the comment author
  // - Register and authenticate a user
  // - Create a comment by the user (simulated)
  // - Update the comment's content
  // - Validate updated comment response
  // - Validate stored comment content is updated
  const authorConnection: api.IConnection = { host: connection.host };
  const authorUser = await authorize_registered_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(authorUser);
  // Since no comment creation API is given, simulate commentId as random UUID
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const updatedCommentContent = RandomGenerator.paragraph({ sentences: 4 });
  // Update the comment with new content by author user
  const updatedComment =
    await api.functional.discussionBoard.registeredUser.comments.update(
      authorConnection,
      {
        commentId,
        body: {
          content: updatedCommentContent,
        },
      },
    );
  typia.assert(updatedComment);
  TestValidator.equals(
    "updated comment id matches",
    updatedComment.id,
    commentId,
  );
  TestValidator.equals(
    "updated comment content matches",
    updatedComment.content,
    updatedCommentContent,
  );
  TestValidator.predicate(
    "updated timestamp updated",
    new Date(updatedComment.updatedAt).getTime() >
      new Date(updatedComment.createdAt).getTime(),
  );
  // Scenario 2: Attempt to update a comment by a different registered user (unauthorized)
  // - Register two users
  // - User 1 updates a comment (simulated by update endpoint to create a comment initial state)
  // - User 2 attempts to update User 1's comment
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_registered_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(user1);
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_registered_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(user2);
  // Simulate comment by user1 by updating comment content
  const commentIdUser1 = typia.random<string & tags.Format<"uuid">>();
  const originalContentUser1 = RandomGenerator.paragraph({ sentences: 2 });
  const commentByUser1 =
    await api.functional.discussionBoard.registeredUser.comments.update(
      user1Connection,
      {
        commentId: commentIdUser1,
        body: { content: originalContentUser1 },
      },
    );
  typia.assert(commentByUser1);
  // User2 attempts to update User1's comment, expecting error
  const newContentByUser2 = RandomGenerator.paragraph({ sentences: 3 });
  await TestValidator.error(
    "unauthorized comment update should fail",
    async () => {
      await api.functional.discussionBoard.registeredUser.comments.update(
        user2Connection,
        {
          commentId: commentIdUser1,
          body: { content: newContentByUser2 },
        },
      );
    },
  );
  // Validate original comment content remains unchanged by fetching with original user
  const commentAfterFailedUpdate =
    await api.functional.discussionBoard.registeredUser.comments.update(
      user1Connection,
      {
        commentId: commentIdUser1,
        body: {},
      },
    );
  typia.assert(commentAfterFailedUpdate);
  TestValidator.equals(
    "comment content unchanged after unauthorized update",
    commentAfterFailedUpdate.content,
    originalContentUser1,
  );
}
