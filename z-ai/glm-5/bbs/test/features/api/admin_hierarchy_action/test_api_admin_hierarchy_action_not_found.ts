import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminHierarchyAction";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test that retrieving a non-existent administrator hierarchy action
 * returns a proper 404 Not Found response.
 *
 * Test Steps:
 * 1. Create and authenticate a user
 * 2. Generate a non-existent UUID
 * 3. Call GET /discussionBoard/user/adminHierarchyActions/{adminHierarchyActionId}
 * 4. Verify the response returns HTTP 404 Not Found status code
 *
 * Expected Result: HTTP 404 error response
 */
export async function test_api_admin_hierarchy_action_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Generate a non-existent UUID and verify 404 response
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for non-existent hierarchy action",
    404,
    async () => {
      await api.functional.discussionBoard.user.adminHierarchyActions.at(
        userConnection,
        {
          adminHierarchyActionId: nonExistentId,
        },
      );
    },
  );
}
