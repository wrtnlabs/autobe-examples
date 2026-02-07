import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVote";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_comment_vote } from "../prepare/prepare_random_discussion_board_comment_vote";

export async function generate_random_discussion_board_user_articles_comments_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardCommentVote.ICreate>;
    params: {
      articleId: string;
      commentId: string;
    };
  },
): Promise<IDiscussionBoardCommentVote> {
  const prepared: IDiscussionBoardCommentVote.ICreate =
    prepare_random_discussion_board_comment_vote(props.body);
  const result: IDiscussionBoardCommentVote =
    await api.functional.discussionBoard.user.articles.comments.votes.create(
      connection,
      {
        articleId: props.params.articleId,
        commentId: props.params.commentId,
        body: prepared,
      },
    );
  return result;
}
