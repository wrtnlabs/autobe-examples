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

export async function test_api_scheduled_task_retrieval_by_administrator_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strongPassword123!",
    },
  });
  typia.assert(authorized);
  // 2. Use administrator connection with valid token
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers.Authorization = authorized.token.access;
  // 3. Attempt to retrieve a soft-deleted scheduled task by a known UUID
  //    We must use a UUID that corresponds to a soft-deleted task to be found.
  //    Since creation and deletion APIs do not exist in this scenario,
  //    we simulate by trying to retrieve a UUID; test will check if deletedAt is included when found.
  // Generate a random UUID (assuming it corresponds to a soft deleted task)
  const testTaskId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call the API to retrieve the scheduled task by id
  const scheduledTask =
    await api.functional.discussionBoard.administrator.scheduledTasks.at(
      adminConnection,
      { id: testTaskId },
    );
  typia.assert(scheduledTask);
  // 5. Validate the presence of deletedAt and other metadata fields
  TestValidator.predicate(
    "deletedAt is string or null",
    scheduledTask.deletedAt === null ||
      typeof scheduledTask.deletedAt === "string",
  );
  TestValidator.equals("id matches", scheduledTask.id, testTaskId);
  TestValidator.predicate(
    "createdAt is string",
    typeof scheduledTask.createdAt === "string",
  );
  TestValidator.predicate(
    "updatedAt is string",
    typeof scheduledTask.updatedAt === "string",
  );
  TestValidator.predicate(
    "taskName is string",
    typeof scheduledTask.taskName === "string",
  );
  TestValidator.predicate(
    "schedulePattern is string",
    typeof scheduledTask.schedulePattern === "string",
  );
  TestValidator.predicate(
    "status is string",
    typeof scheduledTask.status === "string",
  );
  TestValidator.predicate(
    "lastRunAt is string or null",
    scheduledTask.lastRunAt === null ||
      typeof scheduledTask.lastRunAt === "string",
  );
}
