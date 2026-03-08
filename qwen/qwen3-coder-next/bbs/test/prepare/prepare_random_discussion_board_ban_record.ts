import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_ban_record(
  input?: DeepPartial<IDiscussionBoardBanRecord.ICreate> | undefined,
): IDiscussionBoardBanRecord.ICreate {
  return {
    ban_reason:
      input?.ban_reason ?? RandomGenerator.paragraph({ sentences: 3 }),
    discussion_board_member_id:
      input?.discussion_board_member_id ??
      typia.random<string & tags.Format<"uuid">>(),
    administrator_id:
      input?.administrator_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
