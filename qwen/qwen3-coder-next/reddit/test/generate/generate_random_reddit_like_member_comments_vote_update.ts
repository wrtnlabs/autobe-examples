import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_comment_vote } from "../prepare/prepare_random_reddit_like_comment_vote";

export async function generate_random_reddit_like_member_comments_vote_update(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeCommentVote.ICreate> | undefined;
    params: {
      commentId: string;
    };
  },
): Promise<IRedditLikeCommentVote> {
  const prepared: IRedditLikeCommentVote.ICreate =
    prepare_random_reddit_like_comment_vote(props.body);
  return await api.functional.redditLike.member.comments.vote.update(
    connection,
    {
      body: prepared,
      commentId: props.params.commentId,
    },
  );
}
