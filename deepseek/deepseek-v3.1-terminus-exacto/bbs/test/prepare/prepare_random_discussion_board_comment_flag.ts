import { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_comment_flag(
  input?: DeepPartial<IDiscussionBoardCommentFlag.ICreate>,
): IDiscussionBoardCommentFlag.ICreate {
  return {
    flag_reason:
      input?.flag_reason ?? RandomGenerator.paragraph({ sentences: 3 }),
    flag_type:
      input?.flag_type ??
      RandomGenerator.pick([
        "spam",
        "harassment",
        "inappropriate",
        "hate_speech",
        "misinformation",
      ] as const),
  };
}
