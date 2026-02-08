import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_discussion_board_registered_user_comment_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for deletion attempt on a non-existent comment.
  // 1. Authenticate as a registered user by joining.
  // 2. Attempt to delete a comment with a random UUID that does not exist.
  // 3. Validate that a 404 Not Found response is returned.
  // Create a new actor-specific connection for the registered user
  const userConnection: api.IConnection = { host: connection.host };
  // Join as a registered user, IJoin currently has no required fields
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Update userConnection headers with the Authorization token
  if (!userConnection.headers) userConnection.headers = {};
  userConnection.headers.Authorization = authorized.token.access;
  // Generate a random UUID for a non-existent comment id
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the non-existent comment, expecting 404 Not Found
  await TestValidator.httpError(
    "deleting non-existent comment returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.registeredUser.comments.erase(
        userConnection,
        {
          commentId: nonExistentCommentId,
        },
      );
    },
  );
}
