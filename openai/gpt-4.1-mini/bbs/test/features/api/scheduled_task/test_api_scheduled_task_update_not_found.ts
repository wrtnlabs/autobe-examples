import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_scheduled_task_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator with join utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // Inject the authorization token into headers for authenticated requests
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminAuthorized.token.access}`,
  };
  // 2. Prepare a random non-existing UUID for scheduled task update
  const nonExistingId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare an update body with optional fields (empty object for minimal update)
  const updateBody: IDiscussionBoardScheduledTask.IUpdate = {};
  // 4. Attempt to update the scheduled task with a non-existing ID and expect error
  await TestValidator.httpError(
    "scheduled task update not found",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.scheduledTasks.updateScheduledTask(
        superAdminConnection,
        {
          id: nonExistingId,
          body: updateBody,
        },
      );
    },
  );
}
