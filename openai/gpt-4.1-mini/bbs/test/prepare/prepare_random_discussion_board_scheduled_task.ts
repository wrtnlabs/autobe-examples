import { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_scheduled_task(
  input?: DeepPartial<IDiscussionBoardScheduledTask.ICreate>,
): IDiscussionBoardScheduledTask.ICreate {
  return {
    taskName: input?.taskName ?? RandomGenerator.alphabets(10),
    schedulePattern: input?.schedulePattern ?? "0 0 * * *",
    status:
      input?.status ??
      RandomGenerator.pick(["active", "paused", "disabled"] as const),
  };
}
