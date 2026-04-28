import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community_comment_vote } from "../prepare/prepare_random_reddit_like_community_comment_vote";

/**
 * Generate a random Reddit-like community member comment vote for E2E testing.
 *
 * Prepares random comment vote data using the prepare function, then calls the creation endpoint.
 * The vote includes an optional comment ID and a randomly selected direction (upvote or downvote).
 * If a vote already exists for the authenticated member on the specified comment, it will be updated
 * with the new direction.
 */
export async function generate_random_reddit_like_community_member_comment_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeCommunityCommentVote.ICreate> | undefined;
  },
): Promise<IRedditLikeCommunityCommentVote> {
  const prepared: IRedditLikeCommunityCommentVote.ICreate =
    prepare_random_reddit_like_community_comment_vote(props.body);
  return await api.functional.redditLikeCommunity.member.comment_votes.create(
    connection,
    {
      body: prepared,
    },
  );
}
