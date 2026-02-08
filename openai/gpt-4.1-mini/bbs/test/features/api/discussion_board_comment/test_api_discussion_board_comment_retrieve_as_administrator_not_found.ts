import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_discussion_board_comment_retrieve_as_administrator_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: An administrator attempts to retrieve a comment by a UUID that does not exist in the system.
  // Expectation: The system should return an HTTP 404 Not Found error indicating the comment does not exist.
  // 1. Create a new administrator connection and join/register as administrator using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // 2. Generate a random valid UUID for a non-existent commentId
  const fakeCommentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the comment by fakeCommentId via administrator endpoint
  // Expect an HTTP 404 error to be thrown
  await TestValidator.httpError(
    "retrieve non-existent comment results in 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.comments.at(
        adminConnection,
        {
          commentId: fakeCommentId,
        },
      );
    },
  );
}
