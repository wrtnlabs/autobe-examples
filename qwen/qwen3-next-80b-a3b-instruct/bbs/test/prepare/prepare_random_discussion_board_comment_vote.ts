import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVote";
export function prepare_random_discussion_board_comment_vote(
  input?: DeepPartial<IDiscussionBoardCommentVote.ICreate>,
): IDiscussionBoardCommentVote.ICreate {
  return {
    citizenId: typia.random<string & tags.Format<"uuid">>(),
    commentId: typia.random<string & tags.Format<"uuid">>(),
    value: RandomGenerator.pick([-1, 1] as const),
  };
}
