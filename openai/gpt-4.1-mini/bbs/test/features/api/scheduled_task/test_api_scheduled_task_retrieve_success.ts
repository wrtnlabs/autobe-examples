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

export async function test_api_scheduled_task_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization =
    superAdminAuthorized.token.access;
  // 2. Use the id from simulated scheduled task to guarantee existence
  const simulatedTask =
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.at(
      superAdminConnection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(simulatedTask);
  const taskId = simulatedTask.id;
  // 3. Retrieve the scheduled task by id
  const scheduledTask =
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.at(
      superAdminConnection,
      {
        id: taskId,
      },
    );
  // 4. Assert the response structure
  typia.assert(scheduledTask);
  // 5. Validate fields presence and types
  TestValidator.predicate(
    "id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      scheduledTask.id,
    ),
  );
  TestValidator.predicate(
    "taskName is a non-empty string",
    typeof scheduledTask.taskName === "string" &&
      scheduledTask.taskName.length > 0,
  );
  TestValidator.predicate(
    "schedulePattern is a non-empty string",
    typeof scheduledTask.schedulePattern === "string" &&
      scheduledTask.schedulePattern.length > 0,
  );
  if (scheduledTask.lastRunAt !== null) {
    TestValidator.predicate(
      "lastRunAt is ISO date-time string",
      typeof scheduledTask.lastRunAt === "string",
    );
  }
  TestValidator.predicate(
    "status is a non-empty string",
    typeof scheduledTask.status === "string" && scheduledTask.status.length > 0,
  );
  TestValidator.predicate(
    "createdAt is ISO date-time string",
    typeof scheduledTask.createdAt === "string",
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time string",
    typeof scheduledTask.updatedAt === "string",
  );
  if (scheduledTask.deletedAt !== null) {
    TestValidator.predicate(
      "deletedAt is ISO date-time string",
      typeof scheduledTask.deletedAt === "string",
    );
  }
  // 6. Confirm no data modifications by re-retrieving and comparing
  const scheduledTaskRecheck =
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.at(
      superAdminConnection,
      {
        id: taskId,
      },
    );
  typia.assert(scheduledTaskRecheck);
  TestValidator.equals(
    "no data modification on recheck",
    scheduledTask,
    scheduledTaskRecheck,
  );
}
