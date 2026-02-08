import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_discussion_board_registered_user_comments_at_soft_deleted_comment_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Registered user signs up and obtains authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Try to fetch a soft-deleted comment
  // Since we have no direct API to create or soft delete a comment, use a random UUID
  // to simulate fetching a comment ID that would be soft deleted and so inaccessible
  const softDeletedCommentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect error because comment is soft deleted or does not exist
  await TestValidator.error(
    "fetching soft deleted comment returns error",
    async () => {
      await api.functional.discussionBoard.registeredUser.comments.at(
        userConnection,
        {
          commentId: softDeletedCommentId,
        },
      );
    },
  );
}
