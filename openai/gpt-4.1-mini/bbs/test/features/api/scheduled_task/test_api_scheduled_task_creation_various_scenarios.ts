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

export async function test_api_scheduled_task_creation_various_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Economic/Political Discussion Board E2E Test Plan
  // Scenario 1: Successful administrator scheduled task creation
  // Scenario 2: Duplicate taskName prevented
  // Scenario 3: Unauthorized user denied access
  // 1. Setup administrator connection and authenticate by join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!@#",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Scenario 1: Successful creation of a scheduled task
  // Prepare a unique taskName and valid cron schedulePattern
  const taskName = `task_${RandomGenerator.alphaNumeric(8)}`;
  const schedulePattern = "0 0 * * *"; // Daily at midnight
  const status = "active";
  const createBody1: IDiscussionBoardScheduledTask.ICreate = {
    taskName,
    schedulePattern,
    status,
  };
  const createdTask =
    await generate_random_discussion_board_administrator_scheduled_tasks_create_scheduled_task(
      adminConnection,
      { body: createBody1 },
    );
  typia.assert(createdTask);
  TestValidator.equals("created taskName", createdTask.taskName, taskName);
  TestValidator.equals(
    "created schedulePattern",
    createdTask.schedulePattern,
    schedulePattern,
  );
  TestValidator.equals("created status", createdTask.status, status);
  TestValidator.predicate(
    "createdTask.id is UUID format",
    /^[0-9a-fA-F-]{36}$/.test(createdTask.id),
  );
  TestValidator.predicate(
    "createdTask.createdAt is date-time",
    !!createdTask.createdAt,
  );
  // 3. Scenario 2: Attempt to create a scheduled task with duplicate taskName
  // Should throw HttpError with status 409
  await TestValidator.httpError("duplicate taskName error", 409, async () => {
    await generate_random_discussion_board_administrator_scheduled_tasks_create_scheduled_task(
      adminConnection,
      { body: createBody1 },
    );
  });
  // 4. Scenario 3: Unauthorized user tries to create scheduled task
  const userConnection: api.IConnection = { host: connection.host };
  const createBody3: IDiscussionBoardScheduledTask.ICreate = {
    taskName: `unauth_${RandomGenerator.alphaNumeric(8)}`,
    schedulePattern: "15 * * * *",
    status: "active",
  };
  await TestValidator.httpError(
    "unauthorized task creation denied",
    [401, 403],
    async () => {
      // Use raw connection without authorization
      await api.functional.discussionBoard.administrator.scheduledTasks.createScheduledTask(
        userConnection,
        { body: createBody3 },
      );
    },
  );
}
