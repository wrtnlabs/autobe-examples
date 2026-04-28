import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community_post_vote } from "../prepare/prepare_random_reddit_like_community_post_vote";

/**
 * Generate a random Reddit-like community post vote member posts votes create via the API for E2E testing.
 *
 * Prepares random vote direction data (upvote or downvote) using the prepare function, then calls the API to cast a vote on the specified post. Each member may have exactly one vote per post, with subsequent votes replacing the existing direction.
 *
 * The generated vote will be recorded for the authenticated member, affecting the post's vote score and the author's karma accordingly.
 */
export async function generate_random_reddit_like_community_member_posts_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeCommunityPostVote.ICreate>;
    params?: {
      postId: string;
    };
  },
): Promise<IRedditLikeCommunityPostVote> {
  const prepared: IRedditLikeCommunityPostVote.ICreate =
    prepare_random_reddit_like_community_post_vote(props.body);
  const result: IRedditLikeCommunityPostVote =
    await api.functional.redditLikeCommunity.member.posts.votes.create(
      connection,
      {
        postId: props.params!.postId,
        body: prepared,
      },
    );
  return result;
}
