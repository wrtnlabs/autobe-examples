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

export async function test_api_scheduled_tasks_listing_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "P@ssw0rd1234",
    },
  });
  typia.assert(admin);
  // After authorization, adminConnection.headers updated with token
  // 2. Query scheduled tasks with filter that matches no records
  const emptyFilterRequest: IDiscussionBoardScheduledTask.IRequest = {
    taskName: "nonexistenttask",
    page: 1,
    limit: 10,
    sort: "asc",
  };
  const result =
    await api.functional.discussionBoard.administrator.scheduledTasks.index(
      adminConnection,
      { body: emptyFilterRequest },
    );
  typia.assert(result);
  // 3. Validate that the pagination metadata reflects zero records and zero pages
  TestValidator.equals("pagination.records", result.pagination.records, 0);
  TestValidator.equals("pagination.pages", result.pagination.pages, 0);
  TestValidator.equals("pagination.current", result.pagination.current, 1);
  TestValidator.equals("pagination.limit", result.pagination.limit, 10);
  // 4. Validate that data array is empty
  TestValidator.equals("data array length", result.data.length, 0);
}
