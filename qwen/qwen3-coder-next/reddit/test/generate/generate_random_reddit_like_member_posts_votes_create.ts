import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_post_vote } from "../prepare/prepare_random_reddit_like_post_vote";

export async function generate_random_reddit_like_member_posts_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikePostVote.ICreate>;
    params: {
      postId: string;
    };
  },
): Promise<IRedditLikePostVote> {
  const prepared: IRedditLikePostVote.ICreate =
    prepare_random_reddit_like_post_vote(props.body);
  return await api.functional.redditLike.member.posts.votes.create(connection, {
    body: prepared,
    postId: props.params.postId,
  });
}
