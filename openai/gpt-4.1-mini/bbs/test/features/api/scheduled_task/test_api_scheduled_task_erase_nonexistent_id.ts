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

export async function test_api_scheduled_task_erase_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test deleting a non-existing scheduled task ID as a super administrator.
  // 1. Authenticate as super administrator
  // 2. Attempt to delete scheduled task with UUID that doesn't exist
  // 3. Confirm 404 error is thrown by the erase API call
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {}, // Empty body as per IJoin definition
    },
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Attempt to delete a scheduled task with non-existent UUID
  const fakeUuid = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify that deleting the non-existent scheduled task results in 404 error
  await TestValidator.httpError(
    "delete non-existing scheduled task",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.scheduledTasks.erase(
        superAdminConnection,
        { id: fakeUuid },
      );
    },
  );
}
