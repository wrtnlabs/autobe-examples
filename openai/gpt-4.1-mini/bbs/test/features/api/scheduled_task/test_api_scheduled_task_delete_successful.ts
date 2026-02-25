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
import { generate_random_discussion_board_administrator_scheduled_tasks_create_scheduled_task } from "../../../generate/generate_random_discussion_board_administrator_scheduled_tasks_create_scheduled_task";
import { prepare_random_discussion_board_scheduled_task } from "../../../prepare/prepare_random_discussion_board_scheduled_task";

export async function test_api_scheduled_task_delete_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
    },
  });
  adminConnection.headers = { Authorization: admin.token.access };
  // 2. Create a scheduled task for deletion using generation function
  const scheduledTask =
    await generate_random_discussion_board_administrator_scheduled_tasks_create_scheduled_task(
      adminConnection,
      { body: { status: "active" } },
    );
  typia.assert(scheduledTask);
  // 3. Delete the scheduled task
  await api.functional.discussionBoard.administrator.scheduledTasks.erase(
    adminConnection,
    {
      id: scheduledTask.id,
    },
  );
  // 4. Validate deletion: attempt to get the deleted scheduled task (should yield error)
  // Since no GET API is provided in the given API list for scheduledTasks,
  // we confirm deletion by attempting a delete again (should throw error),
  // or rely on response of previous erase.
  await TestValidator.error(
    "delete already deleted scheduled task should fail",
    async () => {
      await api.functional.discussionBoard.administrator.scheduledTasks.erase(
        adminConnection,
        {
          id: scheduledTask.id,
        },
      );
    },
  );
}
