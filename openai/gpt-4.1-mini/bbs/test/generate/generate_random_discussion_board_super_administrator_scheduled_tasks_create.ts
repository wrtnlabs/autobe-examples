import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_scheduled_task } from "../prepare/prepare_random_discussion_board_scheduled_task";

export async function generate_random_discussion_board_super_administrator_scheduled_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardScheduledTask.ICreate>;
  },
): Promise<IDiscussionBoardScheduledTask> {
  const prepared: IDiscussionBoardScheduledTask.ICreate =
    prepare_random_discussion_board_scheduled_task(props.body);
  const result: IDiscussionBoardScheduledTask =
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
