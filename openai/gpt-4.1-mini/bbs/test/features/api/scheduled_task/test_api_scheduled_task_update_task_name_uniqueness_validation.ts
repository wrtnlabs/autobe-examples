import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { generate_random_discussion_board_super_administrator_scheduled_tasks_create } from "../../../generate/generate_random_discussion_board_super_administrator_scheduled_tasks_create";

export async function test_api_scheduled_task_update_task_name_uniqueness_validation(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, { body: {} });
  // Create first scheduled task
  const scheduledTask1 = await generate_random_discussion_board_super_administrator_scheduled_tasks_create(
    superAdminConnection,
    { body: {} },
  );
  typia.assert(scheduledTask1);
  // Create second scheduled task
  const scheduledTask2 = await generate_random_discussion_board_super_administrator_scheduled_tasks_create(
    superAdminConnection,
    { body: {} },
  );
  typia.assert(scheduledTask2);
  // Attempt to update second task with the same task_name to produce conflict
  await TestValidator.error("task name uniqueness enforcement", async () => {
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.updateScheduledTask(
      superAdminConnection,
      {
        id: "",
        body: {
          task_name: "",
        } satisfies Partial<IDiscussionBoardScheduledTask.IUpdate>,
      },
    );
  });
}
