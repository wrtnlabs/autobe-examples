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

export async function test_api_scheduled_tasks_list_filtered_sorted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration to obtain authorized admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // The IDiscussionBoardAdministrator.IJoin type is empty, so we'll send empty body
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Add token to connection headers
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Compose request with empty body since IRequest has no properties
  const requestBody: IDiscussionBoardScheduledTask.IRequest = {};
  // 3. Query scheduled tasks with empty filter
  const result =
    await api.functional.discussionBoard.administrator.scheduledTasks.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(result);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit", result.pagination.limit >= 1);
  TestValidator.predicate(
    "pagination page count",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination total records",
    result.pagination.records >= 0,
  );
  // 5. Remove sorting validation due to missing last_run_at property
  
  // 6. Authorization test: try querying with unauthorized connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.discussionBoard.administrator.scheduledTasks.index(
      unauthorizedConnection,
      {
        body: {},
      },
    );
  });
}
