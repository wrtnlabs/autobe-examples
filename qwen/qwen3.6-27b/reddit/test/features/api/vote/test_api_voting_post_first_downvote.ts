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
 * Test first downvote on a post by an authenticated member.
 *
 * Validates the primary success path for post downvoting: a member who has not previously voted on a post can downvote it. Confirms that the vote record is created with the correct direction and author attribution.
 *
 * Special attention is given to verifying that the vote direction is properly set to 'down', the vote author matches the authenticated member, and the vote correctly references the target post.
 *
 * 1. Register and authenticate a new member.
 * 2. Create a community for the post.
 * 3. Subscribe to the community to gain posting privileges.
 * 4. Create a text post in the community.
 * 5. Downvote the created post.
 * 6. Validate the vote response has direction 'down' and correct author/post references.
 */
export async function test_api_voting_post_first_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe to community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 4. Create a text post
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Downvote the post
  const vote =
    await api.functional.redditLikeCommunity.member.votes.posts.downvote(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(vote);
  // 6. Validate vote response
  TestValidator.equals("vote direction is down", vote.direction, "down");
  TestValidator.equals("vote author matches member", vote.author.id, member.id);
  TestValidator.equals("vote post matches", vote.post.id, post.id);
  TestValidator.predicate(
    "vote created_at is present",
    vote.created_at !== null,
  );
  TestValidator.predicate(
    "vote updated_at is present",
    vote.updated_at !== null,
  );
}
