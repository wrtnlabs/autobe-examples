import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_ban_record(
  input?: DeepPartial<IDiscussionBoardBanRecord.ICreate>,
): IDiscussionBoardBanRecord.ICreate {
  return {
    ban_reason:
      input?.ban_reason ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    ban_duration_days:
      input?.ban_duration_days ??
      (typia.random<boolean>()
        ? typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >()
        : null),
    ban_status:
      input?.ban_status ??
      RandomGenerator.pick(["active", "expired", "revoked"] as const),
  };
}
