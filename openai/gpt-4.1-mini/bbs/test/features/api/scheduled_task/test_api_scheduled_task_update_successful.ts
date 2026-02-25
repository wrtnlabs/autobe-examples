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

export async function test_api_scheduled_task_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authorize a new super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  // Update connection headers with authorization token
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Prepare and create a scheduled task using superAdminConnection for updating
  // Since no creation API provided, simulate an existing scheduled task
  // Generate a valid scheduled task record
  const originalTask: IDiscussionBoardScheduledTask =
    typia.random<IDiscussionBoardScheduledTask>();
  typia.assert(originalTask);
  // 3. Prepare updated data with unique taskName, valid cron schedulePattern, and status
  const updatedBody: IDiscussionBoardScheduledTask.IUpdate = {
    taskName: RandomGenerator.alphabets(10),
    schedulePattern: "0 0 * * *",
    status: "active",
  };
  // 4. Simulate the scheduled task id to update
  const taskId = originalTask.id;
  // 5. Call updateScheduledTask API
  const updatedTask =
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.updateScheduledTask(
      superAdminConnection,
      {
        id: taskId,
        body: updatedBody,
      },
    );
  typia.assert(updatedTask);
  // 6. Validation
  // Confirm updatedTask has the updated fields
  TestValidator.equals(
    "Updated taskName",
    updatedTask.taskName,
    updatedBody.taskName,
  );
  TestValidator.equals(
    "Updated schedulePattern",
    updatedTask.schedulePattern,
    updatedBody.schedulePattern,
  );
  TestValidator.equals(
    "Updated status",
    updatedTask.status,
    updatedBody.status,
  );
  // Confirm lastRunAt was NOT changed
  TestValidator.equals(
    "lastRunAt unchanged",
    updatedTask.lastRunAt,
    originalTask.lastRunAt,
  );
  // Additional validation: Check for id equality
  TestValidator.equals("ID equality", updatedTask.id, originalTask.id);
}
