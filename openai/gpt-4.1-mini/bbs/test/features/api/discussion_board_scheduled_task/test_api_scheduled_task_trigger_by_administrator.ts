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

export async function test_api_scheduled_task_trigger_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Administrator login and authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Generate a random UUID to simulate taskId
  const randomTaskId = typia.random<string & tags.Format<"uuid">>();
  // Trigger the scheduled task using random taskId
  const triggeredTask =
    await api.functional.discussionBoard.scheduled_tasks.trigger(
      adminConnection,
      { taskId: randomTaskId },
    );
  typia.assert(triggeredTask);
  // Skipping validations for last_run_at and status as properties are not defined in the scheduledTask type
}
