import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReply";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_reply_retrieval_validation(
  connection: api.IConnection,
) {
  const guest = await api.functional.auth.guest.join(connection, {
    body: typia.random<IDiscussionBoardGuest.ICreate>(),
  });
  typia.assert(guest);

  await TestValidator.error("invalid commentId format", async () => {
    await api.functional.discussionBoard.comments.replies.at(connection, {
      commentId: "not-a-uuid",
      replyId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  await TestValidator.error("invalid replyId format", async () => {
    await api.functional.discussionBoard.comments.replies.at(connection, {
      commentId: typia.random<string & tags.Format<"uuid">>(),
      replyId: "not-a-uuid",
    });
  });

  await TestValidator.error("missing commentId", async () => {
    await api.functional.discussionBoard.comments.replies.at(connection, {
      commentId: undefined as any,
      replyId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  await TestValidator.error("missing replyId", async () => {
    await api.functional.discussionBoard.comments.replies.at(connection, {
      commentId: typia.random<string & tags.Format<"uuid">>(),
      replyId: undefined as any,
    });
  });
}
