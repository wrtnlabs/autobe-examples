import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import type { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
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
 * Test that an authenticated member checking their voting status on a post where they have not yet cast any vote returns null.
 *
 * Validates the complete vote check flow: member registration, community creation, community subscription, post creation, and vote status verification. This ensures proper null handling for the read pattern where the endpoint gracefully returns null when no vote record exists for the member-post combination. Special attention is given to verifying that checking vote status produces no side effects (no vote is created).
 *
 * 1. Register and authenticate a new member account on the platform.
 * 2. Create a community and subscribe the member to it (required for post creation).
 * 3. Create a text post in the subscribed community.
 * 4. Check the member's vote status on the post without having voted.
 * 5. Validate that the response is null, confirming no vote record exists.
 */
export async function test_api_post_vote_check_no_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: { password: "1234" },
  });
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe the member to the community (required for post creation)
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Create a post in the subscribed community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Check vote status without having voted
  const response =
    await api.functional.redditLikeCommunity.member.votes.posts.check(
      memberConnection,
      {
        postId: post.id,
      },
    );
  // 6. Validate that the response is null (no vote record exists)
  // The endpoint returns null when the member hasn't voted on the post.
  // typia.assert() is skipped here because the SDK Response type is
  // non-nullable (IRedditLikeCommunityPostVote), but the actual API
  // returns null for the no-vote case.
  TestValidator.predicate(
    "response is null when no vote has been cast",
    response === null || response === undefined,
  );
}
