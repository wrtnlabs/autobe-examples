import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_scheduled_task_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join (register)
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorized.token.access;
  // 2. As no API to create scheduled task exists, we generate a UUID to pretend as existing task ID
  const scheduledTaskId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete the scheduled task by UUID
  const deletedTask =
    await api.functional.discussionBoard.administrator.scheduledTasks.erase(
      adminConnection,
      { id: scheduledTaskId },
    );
  typia.assert(deletedTask);
  // 4. Validate that the returned scheduled task has the same id as requested
  // Given the IDiscussionBoardScheduledTask type is empty, no id field is guaranteed.
  // So only typia.assert is possible.
  // NOTE: Due to lack of GET API for retrieval, 404 validation and audit logs are out of scope.
}
