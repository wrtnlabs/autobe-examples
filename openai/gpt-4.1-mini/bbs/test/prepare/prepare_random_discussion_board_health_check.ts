import { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_health_check(
  input?: DeepPartial<IDiscussionBoardHealthCheck.ICreate>,
): IDiscussionBoardHealthCheck.ICreate {
  return {
    status:
      input?.status ??
      RandomGenerator.pick(["OK", "WARNING", "ERROR"] as const),
    checkedAt:
      input?.checkedAt ?? typia.random<string & tags.Format<"date-time">>(),
    details:
      input?.details !== undefined
        ? input.details
        : RandomGenerator.paragraph({ sentences: 3 }),
  };
}
