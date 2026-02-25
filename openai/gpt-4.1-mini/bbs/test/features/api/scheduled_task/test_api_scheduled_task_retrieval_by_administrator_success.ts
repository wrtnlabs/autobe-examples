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

export async function test_api_scheduled_task_retrieval_by_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins (registers) and receives authorization tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123!",
    },
  });
  // Update adminConnection's headers with the new authorization token
  adminConnection.headers = { Authorization: authorizedAdmin.token.access };
  // 2. Retrieve a scheduled task by a randomly generated UUID
  const scheduledTask =
    await api.functional.discussionBoard.administrator.scheduledTasks.at(
      adminConnection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  // 3. Validate the response structure and content
  typia.assert(scheduledTask);
  // Check that all mandatory fields are present and valid
  TestValidator.predicate(
    "valid UUID for id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      scheduledTask.id,
    ),
  );
  TestValidator.predicate(
    "taskName is non-empty string",
    typeof scheduledTask.taskName === "string" &&
      scheduledTask.taskName.length > 0,
  );
  TestValidator.predicate(
    "schedulePattern is non-empty string",
    typeof scheduledTask.schedulePattern === "string" &&
      scheduledTask.schedulePattern.length > 0,
  );
  // lastRunAt can be null or valid ISO string
  if (scheduledTask.lastRunAt !== null) {
    // Validate ISO 8601 date-time format
    TestValidator.predicate(
      "lastRunAt date-time format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        scheduledTask.lastRunAt,
      ),
    );
  }
  TestValidator.predicate(
    "status is a non-empty string",
    typeof scheduledTask.status === "string" && scheduledTask.status.length > 0,
  );
  TestValidator.predicate(
    "createdAt date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      scheduledTask.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      scheduledTask.updatedAt,
    ),
  );
  if (scheduledTask.deletedAt !== null) {
    TestValidator.predicate(
      "deletedAt date-time format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        scheduledTask.deletedAt,
      ),
    );
  }
}
