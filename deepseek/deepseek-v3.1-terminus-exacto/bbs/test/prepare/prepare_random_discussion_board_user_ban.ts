import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_user_ban(
  input?: DeepPartial<IDiscussionBoardUserBan.ICreate> | undefined,
): IDiscussionBoardUserBan.ICreate {
  return {
    member_id: input?.member_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
    expires_at:
      input?.expires_at ??
      (typia.random<boolean>()
        ? typia.random<string & tags.Format<"date-time">>()
        : null),
  };
}
