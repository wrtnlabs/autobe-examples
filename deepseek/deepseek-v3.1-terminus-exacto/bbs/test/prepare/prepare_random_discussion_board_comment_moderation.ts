import { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_comment_moderation(
  input?: DeepPartial<IDiscussionBoardCommentModeration.ICreate>,
): IDiscussionBoardCommentModeration.ICreate {
  return {
    action_type:
      input?.action_type ??
      RandomGenerator.pick(["edit", "delete", "approve", "reject"] as const),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
