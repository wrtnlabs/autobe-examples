import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_super_administrator_scheduled_task_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 2: Attempt to delete a scheduled task with a non-existent UUID by superAdministrator.
  // Steps:
  // 1) Authenticate as superAdministrator (join).
  // 2) Call DELETE /discussionBoard/superAdministrator/scheduledTasks/{id} with a valid UUID format that does not exist in system.
  // 3) Verify proper error handling with informative message and appropriate HTTP error status (e.g., 404 Not Found).
  // Create a dedicated superAdministrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as superAdministrator by joining
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  // Use token to authorize subsequent API calls
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = { Authorization: superAdmin.token.access };
  // 2. Call DELETE with a random UUID that likely does not exist
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify proper error handling with 404 Not Found
  await TestValidator.httpError(
    "delete non-existent scheduled task",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.scheduledTasks.erase(
        authorizedConnection,
        { id: nonExistentId },
      );
    },
  );
}
