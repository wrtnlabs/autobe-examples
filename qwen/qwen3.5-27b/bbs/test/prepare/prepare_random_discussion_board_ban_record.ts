import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_ban_record(
  input?: DeepPartial<IDiscussionBoardBanRecord.ICreate>,
): IDiscussionBoardBanRecord.ICreate {
  const actor_type =
    input?.actor_type ??
    RandomGenerator.pick(["member", "administrator"] as const);
  return {
    actor_type,
    ban_reason:
      input?.ban_reason ?? RandomGenerator.paragraph({ sentences: 3 }),
    member_id:
      input?.member_id ??
      (actor_type === "member"
        ? typia.random<string & tags.Format<"uuid">>()
        : undefined),
    administrator_id:
      input?.administrator_id ??
      (actor_type === "administrator"
        ? typia.random<string & tags.Format<"uuid">>()
        : undefined),
  };
}
