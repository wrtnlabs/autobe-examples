import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_comment_vote } from "../prepare/prepare_random_reddit_clone_comment_vote";

export async function generate_random_reddit_clone_member_comments_vote(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneCommentVote.ICreate> | undefined;
    params: {
      commentId: string;
    };
  },
): Promise<IRedditCloneCommentVote.IResponse> {
  const prepared: IRedditCloneCommentVote.ICreate =
    prepare_random_reddit_clone_comment_vote(props.body);
  return await api.functional.redditClone.member.comments.vote(connection, {
    body: prepared,
    commentId: props.params.commentId,
  });
}
