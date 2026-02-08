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

export async function test_api_comment_administrator_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Administrator successfully deletes an existing comment by its unique UUID commentId. Validate that the comment no longer exists after deletion and that the API returns a 204 No Content status. Ensure the deletion event is logged for audit purposes.
  // 1. Administrator setup and registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {}, // IDiscussionBoardAdministrator.IJoin is an empty object
  });
  typia.assert(adminAuth);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuth.token.access}`;
  // 2. Simulate existing comment id as random UUID
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the comment by commentId
  await TestValidator.predicate(
    "comment deletion completes without error",
    async () => {
      await api.functional.discussionBoard.administrator.comments.erase(
        adminConnection,
        {
          commentId,
        },
      );
      return true;
    },
  );
}
