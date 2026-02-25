import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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

export async function test_api_scheduled_task_retrieval_by_administrator_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving scheduled system task details for a non-existent UUID id as an authorized administrator.
  // Verify the system returns a 404 Not Found status.
  const adminConnectionBase: api.IConnection = { host: connection.host };
  // Use the administrator join utility to create and login an administrator
  const adminAuthorized = await authorize_administrator_join(
    adminConnectionBase,
    { body: {} },
  );
  // Create a new adminConnection with updated headers from the token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuthorized.token.access,
    },
  };
  const nonExistentTaskId = typia.random<string & tags.Format<"uuid">>();
  // Expect a 404 HttpError when fetching non-existent scheduled task
  await TestValidator.httpError(
    "scheduled task retrieval by non-existent administrator task id",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.scheduledTasks.at(
        adminConnection,
        {
          id: nonExistentTaskId,
        },
      );
    },
  );
}
