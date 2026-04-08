import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
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
import { generate_random_reddit_like_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_member_posts_votes_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

/**
 * Test changing a vote from upvote to downvote on a post.
 *
 * Validates the vote modification workflow where a member changes their existing upvote to a downvote on a post. This test ensures that the vote record is properly updated rather than replaced, and verifies the vote type change.
 *
 * The test covers the vote change scenario including:
 * 1. Member authentication and community setup
 * 2. Post creation in a subscribed community
 * 3. Initial upvote casting
 * 4. Vote change to downvote
 * 5. Verification of vote record modification (updated_at changes, created_at stays same)
 * 6. Verification of vote type change to downvote
 *
 * Note: Vote score and karma adjustments cannot be verified directly as read endpoints are not available in the current API. The vote change mechanism is validated through timestamp verification.
 *
 * 1. Member joins with random credentials and authenticates.
 * 2. Member creates a community and becomes the owner.
 * 3. Member subscribes to the community.
 * 4. Member creates a text post in the community.
 * 5. Member casts an upvote on the post.
 * 6. Member changes the vote to downvote.
 * 7. Validates that the vote record was updated (updated_at changed, created_at same).
 * 8. Validates that the vote_type changed to downvote.
 */
export async function test_api_post_voting_upvote_to_downvote_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Subscribe to community
  await generate_random_reddit_like_member_subscriptions_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditLikeCommunitySubscription.ICreate,
    },
  );
  // 4. Create post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Cast upvote
  const upvote = await generate_random_reddit_like_member_posts_votes_create(
    memberConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        vote_type: "upvote",
      } satisfies IRedditLikeVote.ICreate,
    },
  );
  typia.assert(upvote);
  const upvoteCreatedAt = upvote.created_at;
  const upvoteUpdatedAt = upvote.updated_at;
  // 6. Change vote to downvote
  const downvote = await generate_random_reddit_like_member_posts_votes_create(
    memberConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        vote_type: "downvote",
      } satisfies IRedditLikeVote.ICreate,
    },
  );
  typia.assert(downvote);
  // 7. Verify vote record was updated (same created_at, different updated_at)
  TestValidator.equals(
    "created_at unchanged",
    downvote.created_at,
    upvoteCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    downvote.updated_at,
    upvoteUpdatedAt,
  );
  TestValidator.equals("vote_type is downvote", downvote.vote_type, "downvote");
}
