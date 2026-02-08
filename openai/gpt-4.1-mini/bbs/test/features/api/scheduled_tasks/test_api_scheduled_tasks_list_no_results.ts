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

export async function test_api_scheduled_tasks_list_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Attempt unauthorized access with base connection (should fail)
  await TestValidator.httpError(
    "unauthorized access is rejected",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.scheduledTasks.index(
        connection,
        {
          body: {},
        },
      );
    },
  );
  // Step 2: Authorize as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(superAdminConnection, {
    body: {},
  });
  superAdminConnection.headers = { Authorization: auth.token.access };
  // Step 3: Query scheduled tasks with an impossible filter to get empty result
  // Since IDiscussionBoardScheduledTask.IRequest is empty type, send empty object
  const output =
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.index(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(output);
  // Step 4: Assert empty results
  TestValidator.equals("data array is empty", output.data.length, 0);
  TestValidator.equals(
    "pagination.records is zero",
    output.pagination.records,
    0,
  );
  TestValidator.equals("pagination.pages is zero", output.pagination.pages, 0);
  TestValidator.equals("pagination.current is 1", output.pagination.current, 1);
  TestValidator.predicate(
    "pagination.limit is non-negative",
    output.pagination.limit >= 0,
  );
}
