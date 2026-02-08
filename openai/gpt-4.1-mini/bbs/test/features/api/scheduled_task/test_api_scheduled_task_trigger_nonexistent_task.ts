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

export async function test_api_scheduled_task_trigger_nonexistent_task(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Step 2: Create a scheduled task to have a record in the system
  const scheduledTask =
    await generate_random_discussion_board_administrator_scheduled_tasks_create(
      adminConnection,
      { body: undefined },
    );
  typia.assert(scheduledTask);
  // Step 3: Trigger a non-existent scheduled task using a new UUID
  const nonExistentTaskId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Attempt triggering and expect an error indicating the task was not found
  await TestValidator.error(
    "Triggering non-existent scheduled task should fail",
    async () => {
      await api.functional.discussionBoard.scheduled_tasks.trigger(
        adminConnection,
        {
          taskId: nonExistentTaskId,
        },
      );
    },
  );
}
