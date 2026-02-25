import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardScheduledTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_scheduled_tasks_filtered_pagination_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as super administrator and get authorized connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(authorized);
  const actorConnection: api.IConnection = { host: connection.host };
  actorConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Prepare typical filters
  const filterTaskName = authorized.email.split("@")[0];
  const filterStatus = "active";
  const now = new Date();
  const lastRunAtMin = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString(); // 24h ago
  const lastRunAtMax = now.toISOString();
  const schedulePattern = "* * * * *";
  // 3. Perform PATCH request with filters, pagination and sort
  const body: IDiscussionBoardScheduledTask.IRequest = {
    taskName: filterTaskName,
    status: filterStatus,
    schedulePattern,
    lastRunAtMin,
    lastRunAtMax,
    page: 1,
    limit: 10,
    sort: "asc",
  };
  const response =
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.index(
      actorConnection,
      { body },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    response.pagination.current === 1,
  );
  TestValidator.predicate("pagination limit", response.pagination.limit === 10);
  TestValidator.predicate(
    "pagination records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages", response.pagination.pages >= 0);
  // 5. Validate each scheduled task summary structure & fields
  for (const task of response.data) {
    typia.assert(task);
    TestValidator.predicate(
      "taskName filter match",
      task.taskName.includes(filterTaskName),
    );
    TestValidator.equals(
      "task status matches filter",
      task.status,
      filterStatus,
    );
    TestValidator.predicate(
      "schedulePattern match",
      task.schedulePattern === schedulePattern,
    );
    // lastRunAt between filter range or null
    TestValidator.predicate(
      "lastRunAt range or null",
      task.lastRunAt === null ||
        (task.lastRunAt >= lastRunAtMin && task.lastRunAt <= lastRunAtMax),
    );
  }
}
