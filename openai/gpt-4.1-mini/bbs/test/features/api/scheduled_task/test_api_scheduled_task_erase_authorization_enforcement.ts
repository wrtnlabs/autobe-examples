import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
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

export async function test_api_scheduled_task_erase_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies authorization enforcement for deleting scheduled tasks.
  // 1. Attempt to delete scheduled task without any authentication.
  // Expect HTTP 401 Unauthorized or 403 Forbidden error.
  await TestValidator.httpError(
    "unauthorized deletion attempt without authentication",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdministrator.scheduledTasks.erase(
        { host: connection.host },
        { id: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
  // 2. Attempt deletion with a connection authenticated as a non-superAdministrator.
  // Since no other roles or authorization utilities are provided, simulate by
  // using a connection with Authorization header set to an invalid or empty token.
  const invalidAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalidtoken" },
  };
  await TestValidator.httpError(
    "unauthorized deletion attempt with invalid authorization",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdministrator.scheduledTasks.erase(
        invalidAuthConnection,
        { id: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
  // 3. Properly authenticate as a superAdministrator using the join utility function.
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(superAdminConnection, {
    body: {},
  });
  superAdminConnection.headers = {
    Authorization: `Bearer ${auth.token.access}`,
  };
  // 4. Now, attempt to delete a scheduled task with proper super administrator authorization.
  // Use a random uuid for the scheduled task id.
  const id = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.erase(
      superAdminConnection,
      { id },
    );
  // 5. Assert that response matches the scheduled task structure (empty object expected).
  typia.assert(response);
}
