import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardCommentModAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModAction";
import { prepare_random_discussion_board_comment_mod_action } from "../prepare/prepare_random_discussion_board_comment_mod_action";
export async function generate_random_discussion_board_moderator_comments_mod_actions_patch_by_commentid(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardCommentModAction.ICreate> | undefined;
    params: {
      commentId: string;
    };
  },
): Promise<IDiscussionBoardCommentModAction> {
  const prepared: IDiscussionBoardCommentModAction.ICreate =
    prepare_random_discussion_board_comment_mod_action(props.body);
  return await api.functional.discussionBoard.moderator.comments.mod_actions.patchByCommentid(
    connection,
    {
      body: prepared,
      commentId: props.params.commentId,
    },
  );
}
