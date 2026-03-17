import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test that GET /redditLike/member/posts/{postId}/my-vote returns 404
 * when the authenticated member has not voted on the specified post.
 *
 * Scenario:
 * 1. Member A creates a community and subscribes to it
 * 2. Member B joins, subscribes to the same community, and creates a post
 * 3. Member A attempts to retrieve their vote on Member B's post
 * 4. Since Member A hasn't voted, the endpoint should return 404
 */
export async function test_api_post_vote_my_no_vote_exists(
  connection: api.IConnection,
): Promise<void> {
  // Create first member who will check the vote status
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Create community as first member
  const community = await generate_random_reddit_like_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // Subscribe first member to community
  const subscriptionA =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberAConnection,
      { communityId: community.id },
    );
  typia.assert(subscriptionA);
  // Create second member who will create the post
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Subscribe second member to community
  const subscriptionB =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberBConnection,
      { communityId: community.id },
    );
  typia.assert(subscriptionB);
  // Create post as second member
  const post = await generate_random_reddit_like_member_posts_create(
    memberBConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // First member checks their vote on the post without voting
  // Should throw error since no vote exists
  await TestValidator.error(
    "returns 404 when member has not voted",
    async () => {
      await api.functional.redditLike.member.posts.my_vote.myVote(
        memberAConnection,
        {
          postId: post.id,
        },
      );
    },
  );
}
