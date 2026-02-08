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
import { generate_random_discussion_board_administrator_scheduled_tasks_create } from "../../../generate/generate_random_discussion_board_administrator_scheduled_tasks_create";
import { prepare_random_discussion_board_scheduled_task } from "../../../prepare/prepare_random_discussion_board_scheduled_task";

export async function test_api_scheduled_task_trigger_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Test that unauthorized users cannot trigger scheduled tasks.
  // Attempt to trigger a scheduled task without authentication
  // Use a random UUID for taskId since we do not have access to actual scheduled task IDs
  const randomTaskId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">;
  await TestValidator.httpError(
    "unauthorized trigger attempt",
    403,
    async () => {
      await api.functional.discussionBoard.scheduled_tasks.trigger(connection, {
        taskId: randomTaskId,
      });
    },
  );
}
