import { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_ban_duration(
  input?: DeepPartial<IDiscussionBoardBanDuration.ICreate>,
): IDiscussionBoardBanDuration.ICreate {
  const duration_hours =
    input?.duration_hours ??
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>();
  const is_permanent =
    input?.is_permanent ??
    (duration_hours === 0 ? true : typia.random<boolean>());
  return {
    name:
      input?.name ??
      RandomGenerator.pick([
        "1 Day Ban",
        "3 Day Ban",
        "1 Week Ban",
        "1 Month Ban",
        "Permanent Ban",
      ] as const),
    description:
      input?.description ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 12 }),
    duration_hours: duration_hours,
    is_permanent: is_permanent,
  };
}
