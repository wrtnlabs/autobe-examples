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

export async function test_api_scheduled_task_create_duplicate_task_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Pre-create a scheduled task with a random task_name
  const scheduledTask =
    await generate_random_discussion_board_administrator_scheduled_tasks_create(
      adminConnection,
      { body: {} },
    );
  // 3. Attempt to create another scheduled task with the same task_name
  // Since IDiscussionBoardScheduledTask.ICreate schema is empty, we have no properties to send
  // We use the same empty object to test duplicate creation failure as scenario demands
  await TestValidator.error("duplicate task creation fails", async () => {
    await api.functional.discussionBoard.administrator.scheduledTasks.create(
      adminConnection,
      { body: {} },
    );
  });
}
