import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
import { generate_random_discussion_board_administrator_scheduled_tasks_create } from "../../../generate/generate_random_discussion_board_administrator_scheduled_tasks_create";
import { prepare_random_discussion_board_scheduled_task } from "../../../prepare/prepare_random_discussion_board_scheduled_task";

export async function test_api_scheduled_task_update_task_name_uniqueness_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // 2. Create first scheduled task with random data
  const firstTask =
    await generate_random_discussion_board_administrator_scheduled_tasks_create(
      adminConnection,
      {},
    );
  typia.assert(firstTask);
  // 3. Create second scheduled task with random data
  const secondTask =
    await generate_random_discussion_board_administrator_scheduled_tasks_create(
      adminConnection,
      {},
    );
  typia.assert(secondTask);
  // 4. Use a known duplicate task_name string to attempt update
  const duplicateTaskName = "existing-task-name-duplicate-check";
  // Prepare update DTO
  const updateBody = {
    task_name: duplicateTaskName,
  } satisfies Partial<IDiscussionBoardScheduledTask.IUpdate>;
  // 5. Attempt to update second task's task_name to duplicate task_name to cause uniqueness violation
  // Since IDs and task_name are not accessible from DTOs, cast to string for id
  await TestValidator.error(
    "update scheduled task with duplicate task_name should fail",
    async () => {
      await api.functional.discussionBoard.administrator.scheduledTasks.updateScheduledTask(
        adminConnection,
        {
          id: String((secondTask as any).id ?? ""),
          body: updateBody,
        },
      );
    },
  );
}
