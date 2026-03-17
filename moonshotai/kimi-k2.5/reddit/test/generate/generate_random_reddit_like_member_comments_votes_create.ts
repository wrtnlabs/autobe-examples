import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_vote } from "../prepare/prepare_random_reddit_like_vote";

export async function generate_random_reddit_like_member_comments_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeVote.ICreate>;
    params: {
      commentId: string;
    };
  },
): Promise<IRedditLikeVote> {
  const prepared: IRedditLikeVote.ICreate = prepare_random_reddit_like_vote(
    props.body,
  );
  const result: IRedditLikeVote =
    await api.functional.redditLike.member.comments.votes.create(connection, {
      commentId: props.params.commentId,
      body: prepared,
    });
  return result;
}
