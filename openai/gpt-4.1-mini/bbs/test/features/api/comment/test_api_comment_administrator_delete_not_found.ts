import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_comment_administrator_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to delete a non-existing comment UUID by an authorized administrator.
  // Validate that the API returns a 404 Not Found error with consistent error format and no deletion.
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // Generate a random UUID for a comment ID that does NOT exist
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the non-existing comment and expect a 404 HTTP error
  await TestValidator.httpError(
    "deletion of non-existing comment returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.comments.erase(
        adminConnection,
        {
          commentId: nonExistentCommentId,
        },
      );
    },
  );
}
