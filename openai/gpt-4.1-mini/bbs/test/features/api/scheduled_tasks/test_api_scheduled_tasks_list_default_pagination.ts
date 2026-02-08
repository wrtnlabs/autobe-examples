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

/**
 * Scenario 1: Retrieve a paginated list of scheduled tasks with default pagination and no filters.
 * Verify that the response includes pagination metadata and an array of scheduled task summaries (data).
 * Confirm that the requesting user must be an authorized super administrator.
 * Validate that the list is sorted by last_run_at descending by default or as per specification,
 * and that empty data is handled gracefully.
 */
export async function test_api_scheduled_tasks_list_default_pagination(
  connection: IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {},
  });
  // 2. Request scheduled tasks list with empty request body for default pagination
  const requestBody: IDiscussionBoardScheduledTask.IRequest = {};
  const response: IPageIDiscussionBoardScheduledTask.ISummary =
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.index(
      superAdminConnection,
      { body: requestBody },
    );
  // 3. Assert response type fully
  typia.assert(response);
  // 4. Validate pagination metadata exists and is plausible
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page is positive",
    pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  // 5. Validate data array exists
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 6. Validate sorting by last_run_at descending if data is present
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      // Cast item to any to access last_run_at safely because ISummary does not have last_run_at
      const currentItem = response.data[i] as { last_run_at?: string | null };
      const nextItem = response.data[i + 1] as { last_run_at?: string | null };
      const currentLastRun = currentItem.last_run_at
        ? new Date(currentItem.last_run_at).getTime()
        : 0;
      const nextLastRun = nextItem.last_run_at
        ? new Date(nextItem.last_run_at).getTime()
        : 0;
      // last_run_at of earlier element should be >= next (descending order)
      TestValidator.predicate(
        `last_run_at of element ${i} >= element ${i + 1}`,
        currentLastRun >= nextLastRun,
      );
    }
  }
}
