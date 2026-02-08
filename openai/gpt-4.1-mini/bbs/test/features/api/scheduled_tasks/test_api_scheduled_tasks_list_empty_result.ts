import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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

export async function test_api_scheduled_tasks_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator and acquire admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Prepare the request body with non-existing filters
  const body = {
    task_name: "nonexistent_task_name_1234567890",
    status: ["nonexistent_status_value_abc"],
  } satisfies IDiscussionBoardScheduledTask.IRequest;
  // 3. Call the scheduledTasks.index endpoint as administrator
  const output =
    await api.functional.discussionBoard.administrator.scheduledTasks.index(
      adminConnection,
      { body },
    );
  // 4. Assert the response
  typia.assert(output);
  // 5. Validate that pagination metadata shows zero records and pages
  TestValidator.equals("pagination.records", output.pagination.records, 0);
  TestValidator.equals("pagination.pages", output.pagination.pages, 0);
  TestValidator.predicate(
    "pagination.current is 1 or 0",
    output.pagination.current === 0 || output.pagination.current === 1,
  );
  // 6. Validate that data array is empty
  TestValidator.equals("data array is empty", output.data.length, 0);
}
