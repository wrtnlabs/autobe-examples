import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardScheduledTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_scheduled_tasks_listing_authorized_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // Authorization token header set internally, so use adminConnection for subsequent calls
  // 2. Prepare filter parameters including task name pattern 'daily', status 'active', schedule pattern, lastRunAt range and pagination
  // Use fixed or random date range within recent time
  const now = new Date();
  const oneMonthAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const filterBody = {
    taskName: "daily",
    status: "active",
    schedulePattern: "0 0 * * *", // typical daily cron expression at midnight
    lastRunAtMin: oneMonthAgo,
    lastRunAtMax: oneWeekAgo,
    page: 1,
    limit: 10,
    sort: "asc",
  } satisfies IDiscussionBoardScheduledTask.IRequest;
  // 3. Call scheduledTasks.index with filter
  const pagedTasks =
    await api.functional.discussionBoard.administrator.scheduledTasks.index(
      adminConnection,
      { body: filterBody },
    );
  typia.assert(pagedTasks);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page >= 1",
    pagedTasks.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit between 1 and 100",
    pagedTasks.pagination.limit >= 1 && pagedTasks.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagedTasks.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagedTasks.pagination.pages >= 0,
  );
  // 5. Validate each data record matches filters (taskName includes 'daily', status is 'active', schedulePattern matches, lastRunAt in range, deletedAt null)
  for (const task of pagedTasks.data) {
    typia.assert(task);
    // taskName includes 'daily' (case insensitive)
    TestValidator.predicate(
      `taskName includes 'daily'`,
      task.taskName.toLowerCase().includes("daily"),
    );
    TestValidator.equals("status is active", task.status, "active");
    TestValidator.equals(
      "schedulePattern matches",
      task.schedulePattern,
      "0 0 * * *",
    );
    // lastRunAt must be inside lastRunAtMin and lastRunAtMax range or null
    if (task.lastRunAt !== null) {
      const lastRunAtTime = new Date(task.lastRunAt).getTime();
      TestValidator.predicate(
        "lastRunAt >= lastRunAtMin",
        lastRunAtTime >= new Date(oneMonthAgo).getTime(),
      );
      TestValidator.predicate(
        "lastRunAt <= lastRunAtMax",
        lastRunAtTime <= new Date(oneWeekAgo).getTime(),
      );
    }
    // Ensure deletedAt is null (no soft-deleted tasks included)
    TestValidator.equals("deletedAt is null", task.deletedAt, null);
    // Verify createdAt and updatedAt exist and are valid date-time strings
    TestValidator.predicate(
      "createdAt is valid ISO date",
      !isNaN(Date.parse(task.createdAt)),
    );
    TestValidator.predicate(
      "updatedAt is valid ISO date",
      !isNaN(Date.parse(task.updatedAt)),
    );
  }
  // 6. Authorization enforcement: test that unauthorized access is rejected
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access",
    401,
    async () =>
      await api.functional.discussionBoard.administrator.scheduledTasks.index(
        unauthorizedConnection,
        { body: filterBody },
      ),
  );
}
