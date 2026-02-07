import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_user_ban(
  input?: DeepPartial<IDiscussionBoardUserBan.ICreate>,
): IDiscussionBoardUserBan.ICreate {
  const ban_duration_type =
    input?.ban_duration_type ??
    RandomGenerator.pick(["permanent", "temporary", "warning"] as const);
  return {
    banned_user_id:
      input?.banned_user_id ?? typia.random<string & tags.Format<"uuid">>(),
    ban_reason:
      input?.ban_reason ?? RandomGenerator.paragraph({ sentences: 2 }),
    ban_duration_type: ban_duration_type,
    ban_duration_days:
      input?.ban_duration_days ??
      (ban_duration_type === "permanent"
        ? undefined
        : typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>()),
  };
}
