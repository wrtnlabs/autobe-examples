import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_scheduled_task_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new admin connection and register a new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ssw0rd1234",
    },
  });
  // adminConnection headers updated internally by authorize function
  // Create a scheduled task to update (simulate creating a scheduled task directly using random)
  // Because there's no createScheduledTask API, we'll simulate this by calling the update with new ID
  const originalTask = typia.random<IDiscussionBoardScheduledTask>();
  // Prepare update body with changed fields
  const updateBody: IDiscussionBoardScheduledTask.IUpdate = {
    taskName: originalTask.taskName + "_updated",
    schedulePattern: "*/5 * * * *", // run every 5 minutes
    status: originalTask.status === "active" ? "paused" : "active",
  };
  // Perform update
  const updatedTask =
    await api.functional.discussionBoard.administrator.scheduledTasks.updateScheduledTask(
      adminConnection,
      {
        id: originalTask.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTask);
  // Verify updated fields
  TestValidator.equals(
    "task name updated",
    updatedTask.taskName,
    updateBody.taskName,
  );
  TestValidator.equals(
    "schedule pattern updated",
    updatedTask.schedulePattern,
    updateBody.schedulePattern,
  );
  TestValidator.equals("status updated", updatedTask.status, updateBody.status);
  // Verify lastRunAt is unchanged (should match originalTask.lastRunAt)
  TestValidator.equals(
    "last run timestamp unchanged",
    updatedTask.lastRunAt,
    originalTask.lastRunAt,
  );
  // Verify authorization enforcement:
  // Attempt update with a new connection without authorization - should throw
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "update without authorization should fail",
    async () => {
      await api.functional.discussionBoard.administrator.scheduledTasks.updateScheduledTask(
        unauthorizedConnection,
        {
          id: originalTask.id,
          body: updateBody,
        },
      );
    },
  );
}
