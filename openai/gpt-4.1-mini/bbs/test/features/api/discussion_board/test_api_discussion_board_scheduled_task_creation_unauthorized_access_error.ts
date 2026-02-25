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
import { generate_random_discussion_board_super_administrator_scheduled_tasks_create_scheduled_task } from "../../../generate/generate_random_discussion_board_super_administrator_scheduled_tasks_create_scheduled_task";
import { prepare_random_discussion_board_scheduled_task } from "../../../prepare/prepare_random_discussion_board_scheduled_task";

export async function test_api_discussion_board_scheduled_task_creation_unauthorized_access_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Attempt to create scheduled task without authentication
  await TestValidator.httpError("unauthorized without token", 401, async () => {
    // Directly use the base connection without any authorization
    await generate_random_discussion_board_super_administrator_scheduled_tasks_create_scheduled_task(
      connection,
      {
        body: {
          taskName: typia.random<string>(),
          schedulePattern: typia.random<string>(),
          status: "active",
        },
      },
    );
  });
  // 2. Attempt to create scheduled task as a user with superAdministrator join but without token usage (simulate another role)
  // We first register a super administrator user, but use a new connection without setting Authorization token to simulate unauthorized user
  const superAdminJoinResult = await authorize_super_administrator_join(
    { host: connection.host },
    {},
  );
  // New connection without Authorization header to simulate unauthorized user
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized with invalid role or missing token",
    401,
    async () => {
      await generate_random_discussion_board_super_administrator_scheduled_tasks_create_scheduled_task(
        unauthorizedConnection,
        {
          body: {
            taskName: typia.random<string>(),
            schedulePattern: typia.random<string>(),
            status: "active",
          },
        },
      );
    },
  );
}
