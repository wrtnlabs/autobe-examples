import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_posts_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_votes_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test the vote update business logic where a member changes their existing vote on a post.
 *
 * Validates the complete vote update workflow including member authentication, community creation, subscription, post creation, and vote modification. Ensures that casting a second vote on the same post updates the existing vote record rather than creating a duplicate, and that the vote score correctly reflects the net change.
 *
 * Special attention is given to verifying that the uniqueness constraint is enforced (one vote per member-post combination), the updated_at timestamp differs from created_at after modification, and the post's vote_score accurately reflects the vote value change from +1 to -1.
 *
 * 1. Member registers and authenticates via join operation.
 * 2. Member creates a community they own.
 * 3. Member subscribes to their own community (required for posting).
 * 4. Member creates a text post in the community.
 * 5. Member casts initial upvote (+1) on the post.
 * 6. Member casts downvote (-1) on the same post, updating the existing vote.
 * 7. Validates vote record shows updated value and updated_at timestamp.
 * 8. Validates post vote_score changed from +1 to -1.
 */
export async function test_api_post_vote_update_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community owned by the member
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to their own community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Verify initial post vote score is 0 (no votes yet)
  TestValidator.equals("initial vote score", post.voteScore, 0);
  // 5. Cast initial upvote (+1) on the post
  const firstVote =
    await generate_random_reddit_community_member_posts_votes_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          value: 1,
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
  typia.assert(firstVote);
  // Validate first vote
  TestValidator.equals("first vote value", firstVote.value, 1);
  TestValidator.equals(
    "first vote created_at equals updated_at",
    firstVote.created_at,
    firstVote.updated_at,
  );
  TestValidator.equals("vote score after upvote", firstVote.post.vote_score, 1);
  // 6. Cast downvote (-1) on the same post (should update existing vote)
  const updatedVote =
    await generate_random_reddit_community_member_posts_votes_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          value: -1,
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
  typia.assert(updatedVote);
  // 7. Validate vote update behavior
  TestValidator.equals("updated vote value", updatedVote.value, -1);
  TestValidator.equals("vote id unchanged", updatedVote.id, firstVote.id);
  TestValidator.notEquals(
    "updated_at differs from created_at",
    updatedVote.updated_at,
    updatedVote.created_at,
  );
  // 8. Verify post vote score changed from +1 to -1 (net change of -2)
  TestValidator.equals(
    "vote score after downvote",
    updatedVote.post.vote_score,
    -1,
  );
}
