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

export async function test_api_discussion_board_scheduled_task_creation_by_super_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator and obtain authorized token
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // Setup connection with bearer token from super admin for authorized API calls
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${superAdmin.token.access}` },
  };
  // 2. Prepare a unique scheduled task creation body
  const taskName = `task-${Date.now()}-${RandomGenerator.alphabets(8)}`;
  const schedulePattern = "0 0 * * *"; // Run daily at midnight
  const status = "active";
  const body: IDiscussionBoardScheduledTask.ICreate = {
    taskName,
    schedulePattern,
    status,
  };
  // 3. Create scheduled task using utility generation function
  const createdTask =
    await generate_random_discussion_board_super_administrator_scheduled_tasks_create_scheduled_task(
      authorizedConnection,
      { body },
    );
  // 4. Assert the returned object matches the schema
  typia.assert(createdTask);
  // 5. Validate key fields
  TestValidator.equals("taskName", createdTask.taskName, taskName);
  TestValidator.equals(
    "schedulePattern",
    createdTask.schedulePattern,
    schedulePattern,
  );
  TestValidator.equals("status", createdTask.status, status);
  TestValidator.predicate(
    "createdTask id exists",
    typeof createdTask.id === "string" && createdTask.id.length > 0,
  );
  TestValidator.predicate(
    "createdAt timestamp format",
    typeof createdTask.createdAt === "string" &&
      createdTask.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt timestamp format",
    typeof createdTask.updatedAt === "string" &&
      createdTask.updatedAt.length > 0,
  );
  // lastRunAt and deletedAt may be null as new task
  TestValidator.predicate(
    "lastRunAt is null or string",
    createdTask.lastRunAt === null ||
      (typeof createdTask.lastRunAt === "string" &&
        createdTask.lastRunAt.length > 0),
  );
  TestValidator.equals("deletedAt", createdTask.deletedAt, null);
}
