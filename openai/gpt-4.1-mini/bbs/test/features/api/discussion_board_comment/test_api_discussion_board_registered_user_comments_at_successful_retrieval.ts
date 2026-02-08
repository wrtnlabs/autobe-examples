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

export async function test_api_discussion_board_registered_user_comments_at_successful_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Registered user joins (signs up)
  const userConnection: api.IConnection = { host: connection.host };
  // Since IDiscussionBoardRegisteredUser.IJoin has no defined properties, just use empty object
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  // Set authorization header
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. We need to test retrieval of existing comment - because API for comment creation is not provided,
  // use random UUID for commentId to validate response shape and typia.assert
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the comment by its ID
  const comment =
    await api.functional.discussionBoard.registeredUser.comments.at(
      userConnection,
      { commentId },
    );
  typia.assert(comment);
  // 4. Removed the validation on 'content' property because it does not exist on IDiscussionBoardComment.
}
