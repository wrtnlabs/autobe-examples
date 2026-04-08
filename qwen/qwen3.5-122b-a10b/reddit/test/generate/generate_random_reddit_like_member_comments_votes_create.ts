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
 * Generate a random vote on a comment via the API for E2E testing.
 *
 * Prepares random vote data using the prepare function, then calls the vote creation endpoint.
 * The vote is cast on the comment specified by commentId and affects both the comment's
 * vote score and the comment author's karma score.
 *
 * @param connection - The API connection object
 * @param props.body - Optional partial vote data to override defaults
 * @param props.params.commentId - UUID of the comment to vote on (required)
 * @returns The created or updated vote record with all vote details
 */
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
