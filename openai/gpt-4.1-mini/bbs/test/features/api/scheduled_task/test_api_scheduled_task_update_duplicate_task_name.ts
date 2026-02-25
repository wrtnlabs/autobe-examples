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

export async function test_api_scheduled_task_update_duplicate_task_name(
  connection: api.IConnection,
): Promise<void> {
  // Test case for updating a scheduled task by super administrator where the taskName is attempted to be updated to a duplicate name already existing for another scheduled task.
  // 1. Authenticate as super administrator (join and authorize)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Generate two distinct scheduled tasks locally as mock existing resources with unique taskNames
  const scheduledTaskFactory =
    async (): Promise<IDiscussionBoardScheduledTask> => {
      const body: IDiscussionBoardScheduledTask.IUpdate = {
        taskName: RandomGenerator.alphabets(10) + Date.now().toString(),
        schedulePattern: "0 0 * * *",
        status: "active",
      };
      const task: IDiscussionBoardScheduledTask = {
        id: typia.random<string & tags.Format<"uuid">>(),
        taskName: body.taskName!,
        schedulePattern: body.schedulePattern ?? "0 0 * * *",
        lastRunAt: null,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      return task;
    };
  const firstTask = await scheduledTaskFactory();
  const secondTask = await scheduledTaskFactory();
  // 3. Attempt to update the second scheduled task's taskName to the first's taskName
  const updateBody: IDiscussionBoardScheduledTask.IUpdate = {
    taskName: firstTask.taskName,
  };
  // 4. Verify the update is rejected due to duplicate taskName
  await TestValidator.error(
    "should reject duplicate taskName update",
    async () => {
      await api.functional.discussionBoard.superAdministrator.scheduledTasks.updateScheduledTask(
        superAdminConnection,
        {
          id: secondTask.id,
          body: updateBody,
        },
      );
    },
  );
}
