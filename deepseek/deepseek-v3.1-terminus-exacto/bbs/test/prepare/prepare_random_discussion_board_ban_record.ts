import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_ban_record(
  input?: DeepPartial<IDiscussionBoardBanRecord.ICreate>,
): IDiscussionBoardBanRecord.ICreate {
  const banDurationType =
    input?.banDurationType ??
    RandomGenerator.pick(["temporary", "permanent"] as const);
  return {
    bannedUserId:
      input?.bannedUserId ?? typia.random<string & tags.Format<"uuid">>(),
    banReason:
      input?.banReason ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    banDurationType: banDurationType,
    banDurationDays:
      input?.banDurationDays ??
      (banDurationType === "temporary"
        ? typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
          >()
        : null),
  };
}
