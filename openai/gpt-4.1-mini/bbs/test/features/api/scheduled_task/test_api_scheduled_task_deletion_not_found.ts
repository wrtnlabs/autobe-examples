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

export async function test_api_scheduled_task_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication and obtain authorized connection.
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Update adminConnection's headers with authorization token
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Attempt to delete a scheduled task with a random UUID that does not exist.
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect 404 error when attempting deletion.
  await TestValidator.httpError(
    "delete non-existent scheduled task returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.scheduledTasks.erase(
        adminConnection,
        { id: nonExistentId },
      );
    },
  );
}
