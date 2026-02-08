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
import { generate_random_discussion_board_super_administrator_scheduled_tasks_create } from "../../../generate/generate_random_discussion_board_super_administrator_scheduled_tasks_create";
import { prepare_random_discussion_board_scheduled_task } from "../../../prepare/prepare_random_discussion_board_scheduled_task";

export async function test_api_scheduled_task_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {} satisfies IDiscussionBoardSuperAdministrator.IJoin,
    },
  );
  superAdminConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a scheduled task
  const createdTask =
    await generate_random_discussion_board_super_administrator_scheduled_tasks_create(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(createdTask);
  // 3. Prepare updated data to update the scheduled task
  const updatedBody = {
    task_name: RandomGenerator.name(3),
    schedule_pattern: "0 0 * * *", // daily at midnight
    status: "active",
    last_run_at: new Date().toISOString(),
  } satisfies IDiscussionBoardScheduledTask.IUpdate;
  // 4. Update scheduled task using its id if available, else use a random uuid
  const scheduledTaskId: string =
    (createdTask as any).id ?? typia.random<string & tags.Format<"uuid">>();
  const updatedTask =
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.updateScheduledTask(
      superAdminConnection,
      {
        id: scheduledTaskId,
        body: updatedBody,
      },
    );
  typia.assert(updatedTask);
}
