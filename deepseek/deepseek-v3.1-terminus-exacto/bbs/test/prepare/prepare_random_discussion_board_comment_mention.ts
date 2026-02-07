import { IDiscussionBoardCommentMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentMention";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_comment_mention(
  input?: DeepPartial<IDiscussionBoardCommentMention.ICreate>,
): IDiscussionBoardCommentMention.ICreate {
  const position_start =
    input?.position_start ??
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >();
  return {
    discussion_board_user_id:
      input?.discussion_board_user_id ??
      typia.random<string & tags.Format<"uuid">>(),
    position_start: position_start,
    position_end:
      input?.position_end ??
      position_start +
        typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
        >(),
  };
}
