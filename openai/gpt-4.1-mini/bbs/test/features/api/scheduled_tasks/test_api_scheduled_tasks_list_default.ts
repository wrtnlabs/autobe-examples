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

export async function test_api_scheduled_tasks_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration (join) to obtain authorization tokens
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Query scheduled tasks list without any filter
  const response =
    await api.functional.discussionBoard.administrator.scheduledTasks.index(
      adminConnection,
      {
        body: {}, // empty filter means no filtering, default pagination
      },
    );
  // 3. Validate response structure and types
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate each scheduled task summary fields are present
  for (const task of response.data) {
    typia.assert(task);
  }
  // 6. Authorization enforcement test - ensure only admin can access
  const userConnection: api.IConnection = { host: connection.host };
  // No authorization headers
  await TestValidator.httpError(
    "unauthorized access without admin token",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.scheduledTasks.index(
        userConnection,
        { body: {} },
      );
    },
  );
}
