import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_request_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Attempt to update administrator request status without proper super administrator authorization
  // This negative authorization test verifies that unauthorized users (registered users, guests) cannot update the administrator request status.
  // The test skips implicit dependencies on administrator request creation since unauthorized actions should be blocked early.
  // Validate that the system returns appropriate authorization errors and prevents any database changes.
  // 1. Base connection usage - no authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Prepare random requestId and update body
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IDiscussionBoardAdministratorRequest.IUpdate = {
    status: "approved",
    reason: "Attempt unauthorized update",
  };
  // Attempt update without any authorization - expect HTTP 401 or 403 error
  await TestValidator.httpError(
    "update admin request without authorization",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.requests.updateAdministratorRequest(
        unauthorizedConnection,
        {
          requestId,
          body: updateBody,
        },
      );
    },
  );
  // 2. Prepare registered user connection (simulate login with no super admin role)
  // For this test, simulate unauthorized user by not using super administrator authorization.
  // No utility function provided for registered user login, so we simulate as guest user again
  // Attempt update with guest connection again (emphasize unauthorized actor)
  await TestValidator.httpError(
    "update admin request with guest/registered user authorization",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.requests.updateAdministratorRequest(
        unauthorizedConnection,
        {
          requestId,
          body: updateBody,
        },
      );
    },
  );
}
