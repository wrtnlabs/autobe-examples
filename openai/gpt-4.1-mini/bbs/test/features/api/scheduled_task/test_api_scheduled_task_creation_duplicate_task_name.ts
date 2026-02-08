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

export async function test_api_scheduled_task_creation_duplicate_task_name(
  connection: api.IConnection,
): Promise<void> {
  // Test creating a scheduled task with a duplicated task_name.
  // The task_name already exists in the system.
  // 1. Authenticate as a superAdministrator by joining a new account
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminJoinConnection,
    {
      body: {}, // IDiscussionBoardSuperAdministrator.IJoin has no defined properties
    },
  );
  // Once authorized, create a new authorized connection for superAdministrator
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${superAdminAuth.token.access}` },
  };
  // 2. Create a scheduled task for the first time
  const firstTaskRaw = await generate_random_discussion_board_super_administrator_scheduled_tasks_create(
    superAdminConnection,
    {
      body: {}, // partial random generate
    },
  );
  const firstTask = typia.assert<Partial<{ task_name: string }>>(firstTaskRaw);
  // 3. Attempt to create another scheduled task with the same task_name
  const duplicateBody: Partial<IDiscussionBoardScheduledTask.ICreate> = {
    task_name: firstTask.task_name!, // safely accessed
  };
  await TestValidator.error(
    "creating scheduled task with duplicate task_name should fail",
    async () => {
      await generate_random_discussion_board_super_administrator_scheduled_tasks_create(
        superAdminConnection,
        {
          body: duplicateBody,
        },
      );
    },
  );
}
