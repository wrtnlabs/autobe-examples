import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_scheduled_task_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication via join (registration) endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {}, // let the function generate random valid join data
  });
  typia.assert(admin);
  // 2. Attempt to delete a non-existent scheduled task using random UUID
  const randomTaskId = typia.random<string & tags.Format<"uuid">>();
  // 3. Ensure deleting non-existent task throws HttpError with 404 status
  await TestValidator.httpError(
    "delete non-existent scheduled task returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.scheduledTasks.erase(
        adminConnection,
        {
          id: randomTaskId,
        },
      );
    },
  );
}
