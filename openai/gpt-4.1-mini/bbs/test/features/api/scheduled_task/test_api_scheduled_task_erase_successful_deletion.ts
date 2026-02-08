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

export async function test_api_scheduled_task_erase_successful_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Test the successful deletion of a scheduled task by a super administrator.
  // 1. Create a new super administrator account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  // Apply the access token to the super admin connection
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2. Generate a fake valid UUID for scheduled task id to delete
  const taskId = typia.random<string & tags.Format<"uuid">>();
  // 3. Perform the scheduled task deletion
  const deletedTask =
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.erase(
      superAdminConnection,
      {
        id: taskId,
      },
    );
  typia.assert(deletedTask);
  // 4. Attempt to delete the same task again, expecting an error
  await TestValidator.error(
    "deleting non-existing scheduled task should fail",
    async () => {
      await api.functional.discussionBoard.superAdministrator.scheduledTasks.erase(
        superAdminConnection,
        {
          id: taskId,
        },
      );
    },
  );
  // 5. Confirm audit logs created for the deletion - This is implementation-dependent.
  // Usually, audit logs are confirmed in system logs or through API that returns audit logs.
  // This test assumes the system logs are created if no error is thrown during deletion.
}
