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

export async function test_api_scheduled_task_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdministrator connection and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(superAdminConnection, {
    body: {},
  });
  superAdminConnection.headers = {
    Authorization: `Bearer ${auth.token.access}`,
  };
  // Generate a valid UUID for scheduledTask ID
  const validTaskId = typia.random<string & typia.tags.Format<"uuid">>();
  // Retrieve scheduled task by valid UUID
  const scheduledTask =
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.at(
      superAdminConnection,
      { id: validTaskId },
    );
  typia.assert(scheduledTask);
  // Test invalid UUID format error
  await TestValidator.error("invalid UUID format", async () => {
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.at(
      superAdminConnection,
      { id: "invalid-uuid" as string & typia.tags.Format<"uuid"> },
    );
  });
  // Test unauthorized access
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.at(
      unauthorizedConnection,
      { id: validTaskId },
    );
  });
}
