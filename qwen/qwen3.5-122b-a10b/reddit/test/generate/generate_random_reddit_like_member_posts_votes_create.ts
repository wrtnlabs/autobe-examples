import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_vote } from "../prepare/prepare_random_reddit_like_vote";

/**
 * Generate a random vote on a post via the API for E2E testing.
 *
 * Prepares random vote data using the prepare function, then calls the vote creation endpoint. The vote is cast on the specified post by the authenticated member.
 *
 * @param connection - The connection to the API server
 * @param props.body - Optional partial vote data to override defaults
 * @param props.params.postId - The ID of the post to vote on
 * @returns The created/updated vote record with vote type and timestamps
 */
export async function generate_random_reddit_like_member_posts_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeVote.ICreate>;
    params: {
      postId: string;
    };
  },
): Promise<IRedditLikeVote> {
  const prepared: IRedditLikeVote.ICreate = prepare_random_reddit_like_vote(
    props.body,
  );
  const result: IRedditLikeVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: props.params.postId,
      body: prepared,
    });
  return result;
}
