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

/*
 * Test retrieving a scheduled task with an id that does not exist in the system.
 * Preconditions: a superAdministrator user is authenticated.
 * The test confirms the system returns a 404 not found error with an appropriate error
 * message when the scheduled task id is invalid.
 * This validates the error handling for missing resources while enforcing authorization.
 */
export async function test_api_scheduled_task_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a new superAdministrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as superAdministrator using join utility
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: "superadmin@example.com",
        password: "StrongPass123!",
        href: "https://app.example.com/join",
        referrer: "https://app.example.com",
      },
    },
  );
  // Set authorization header with token
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: authorized.token.access,
  };
  // Use a random UUID that does not exist as the scheduled task ID
  const nonExistentId = typia.random<string & typia.tags.Format<"uuid">>();
  // Test expect 404 error when retrieving a scheduled task with non-existent id
  await TestValidator.httpError(
    "scheduled task retrieve not found 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.scheduledTasks.at(
        superAdminConnection,
        { id: nonExistentId },
      );
    },
  );
}
