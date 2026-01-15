import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVote";
import { prepare_random_discussion_board_comment_vote } from "../prepare/prepare_random_discussion_board_comment_vote";
export async function generate_random_discussion_board_comments_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardCommentVote.ICreate>;
    params: {
      commentId: string;
    };
  },
): Promise<IDiscussionBoardCommentVote> {
  const prepared: IDiscussionBoardCommentVote.ICreate =
    prepare_random_discussion_board_comment_vote(props.body);
  return await api.functional.discussionBoard.comments.votes.create(
    connection,
    {
      body: prepared,
      commentId: props.params.commentId,
    },
  );
}
