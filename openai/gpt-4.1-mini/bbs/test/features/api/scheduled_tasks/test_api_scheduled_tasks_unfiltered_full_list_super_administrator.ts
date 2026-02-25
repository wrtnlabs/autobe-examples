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

export async function test_api_scheduled_tasks_unfiltered_full_list_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = superAdmin.token.access;
  // Step 2. Retrieve scheduled tasks with no filters (empty request body)
  const requestBody: IDiscussionBoardScheduledTask.IRequest = {};
  const response =
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.index(
      superAdminConnection,
      { body: requestBody },
    );
  // Step 3. Validate response structure and data
  typia.assert(response);
  // Step 4. Check pagination defaults
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page defaults to >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  // Step 5. Validate each task summary
  for (const task of response.data) {
    typia.assert(task);
    TestValidator.predicate(
      "task id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        task.id,
      ),
    );
    TestValidator.predicate(
      "taskName is non-empty string",
      task.taskName.length > 0,
    );
    TestValidator.predicate(
      "schedulePattern is non-empty string",
      task.schedulePattern.length > 0,
    );
    TestValidator.predicate(
      "status is non-empty string",
      task.status.length > 0,
    );
    TestValidator.predicate(
      "createdAt is date-time string",
      !isNaN(Date.parse(task.createdAt)),
    );
    TestValidator.predicate(
      "updatedAt is date-time string",
      !isNaN(Date.parse(task.updatedAt)),
    );
    if (task.deletedAt !== null) {
      TestValidator.predicate(
        "deletedAt is null or date-time string",
        !isNaN(Date.parse(task.deletedAt)),
      );
    }
  }
  // Step 6. Check consistency between pagination records and data length
  TestValidator.equals(
    "data length matches records count or less",
    response.data.length <= pagination.records,
    true
  );
}
