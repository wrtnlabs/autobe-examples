import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Test removing an upvote from a post and verifying score adjustments.
 *
 * Validates the complete upvote removal workflow by first establishing an upvote on a post, then removing it via the dedicated remove endpoint. Verifies that the post's vote score and the author's karma score both return to their original baseline values after the vote is removed.
 *
 * The upvote removal operation deletes the voter's vote record, decrements the post's vote score by 1 (for upvotes), and decrements the author's karma by 1 (for upvotes). The response returns the updated post summary containing the adjusted vote_score and the author profile with the restored karma value.
 *
 * 1. Author registers and creates a community.
 * 2. Author subscribes to the community and creates a post.
 * 3. Baseline vote_score and author karma are captured from the post creation response.
 * 4. A separate voter member registers and casts an upvote on the post.
 * 5. The voter removes their upvote via the remove endpoint.
 * 6. Validates vote_score returns to the initial baseline (decreased by 1 from upvoted +1).
 * 7. Validates author karma returns to the initial baseline (decreased by 1 from upvoted +1).
 */
export async function test_api_post_vote_removal_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register author member
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, { body: {} });
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      authorConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Author subscribes to community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      authorConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Create post in community
  const post = await generate_random_reddit_like_community_member_posts_create(
    authorConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // Capture baseline vote_score and author karma
  const initialVoteScore = post.vote_score;
  const initialKarma = post.author.karma;
  // 5. Register voter member separately
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, { body: {} });
  // 6. Voter casts upvote on post
  await api.functional.redditLikeCommunity.member.votes.posts.upvote(
    voterConnection,
    { postId: post.id },
  );
  // 7. Voter removes their upvote
  const updatedPostSummary =
    await api.functional.redditLikeCommunity.member.votes.posts.remove(
      voterConnection,
      { postId: post.id },
    );
  typia.assert(updatedPostSummary);
  // 8. Validate vote_score returns to initial state after vote removal
  TestValidator.equals(
    "vote_score returns to initial after vote removal",
    updatedPostSummary.vote_score,
    initialVoteScore,
  );
  // 9. Validate author karma returns to initial state after vote removal
  TestValidator.equals(
    "author karma returns to initial after vote removal",
    (updatedPostSummary.author as any).karma,
    initialKarma,
  );
}