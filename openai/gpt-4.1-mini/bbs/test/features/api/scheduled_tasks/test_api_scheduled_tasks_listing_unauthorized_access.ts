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

export async function test_api_scheduled_tasks_listing_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test sends a PATCH request to /discussionBoard/administrator/scheduledTasks
  // without any authentication header. It expects the call to fail with
  // an HTTP 401 Unauthorized error, confirming strict authorization enforcement.
  // Create a fresh connection with host only, no authentication headers
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Prepare empty body as no filters are required
  const body: IDiscussionBoardScheduledTask.IRequest = {};
  // Call the index function without any authorization and expect 401 error
  await TestValidator.httpError(
    "unauthorized access should be rejected with 401",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.scheduledTasks.index(
        unauthorizedConnection,
        { body },
      );
    },
  );
}
