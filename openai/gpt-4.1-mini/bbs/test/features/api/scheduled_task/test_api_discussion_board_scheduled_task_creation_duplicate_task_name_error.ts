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
import { generate_random_discussion_board_super_administrator_scheduled_tasks_create_scheduled_task } from "../../../generate/generate_random_discussion_board_super_administrator_scheduled_tasks_create_scheduled_task";
import { prepare_random_discussion_board_scheduled_task } from "../../../prepare/prepare_random_discussion_board_scheduled_task";

export async function test_api_discussion_board_scheduled_task_creation_duplicate_task_name_error(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies creating a scheduled task with a duplicate taskName fails
  // 1. Super administrator registration and authorization
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongP@ssword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  // Update headers after join
  superAdminConnection.headers = { Authorization: superAdmin.token.access };
  // 2. Create a scheduled task with a unique taskName
  const taskBody: IDiscussionBoardScheduledTask.ICreate = {
    taskName: `task_${RandomGenerator.alphabets(8)}`,
    schedulePattern: "0 0 * * *", // every day at midnight
    status: "active",
  };
  const createdTask =
    await generate_random_discussion_board_super_administrator_scheduled_tasks_create_scheduled_task(
      superAdminConnection,
      {
        body: taskBody,
      },
    );
  typia.assert(createdTask);
  // 3. Attempt to create another scheduled task with the same taskName to trigger conflict
  await TestValidator.error("duplicate taskName error", async () => {
    await generate_random_discussion_board_super_administrator_scheduled_tasks_create_scheduled_task(
      superAdminConnection,
      {
        body: taskBody,
      },
    );
  });
}
