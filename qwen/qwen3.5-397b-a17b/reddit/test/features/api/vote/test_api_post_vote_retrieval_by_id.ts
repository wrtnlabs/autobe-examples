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
 * Test retrieving a specific vote record by its unique identifier.
 *
 * Validates the complete vote retrieval workflow including member authentication, community creation, subscription, post creation, vote casting, and vote record retrieval. Ensures that the vote can be retrieved using the vote ID and that all response fields contain correct data.
 *
 * The test verifies that the vote value matches the cast vote (+1 for upvote), the voter member information is correctly populated, the target post information is accurate, and timestamps are properly formatted. Special attention is given to confirming the vote is accessible through the post path structure.
 *
 * 1. Member registers and authenticates with randomized credentials.
 * 2. Member creates a community with random name and description.
 * 3. Member subscribes to the created community.
 * 4. Member creates a text post in the community.
 * 5. Member casts an upvote (+1) on their own post.
 * 6. Member retrieves the vote record using the vote ID.
 * 7. Validates vote value, member info, post info, and timestamps.
 */
export async function test_api_post_vote_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
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
  // 4. Create post
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Cast upvote on post
  const vote = await generate_random_reddit_community_member_posts_votes_create(
    memberConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        value: 1,
      } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  typia.assert(vote);
  // 6. Retrieve vote by ID
  const retrievedVote =
    await api.functional.redditCommunity.member.posts.votes.at(
      memberConnection,
      {
        postId: post.id,
        voteId: vote.id,
      },
    );
  typia.assert(retrievedVote);
  // 7. Validate vote retrieval
  TestValidator.equals("vote ID matches", retrievedVote.id, vote.id);
  TestValidator.equals("vote value is upvote", retrievedVote.value, 1);
  TestValidator.equals(
    "voter member ID matches",
    retrievedVote.member.id,
    subscription.member.id,
  );
  TestValidator.equals(
    "target post ID matches",
    retrievedVote.post.id,
    post.id,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedVote.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedVote.updated_at !== null,
  );
  TestValidator.equals(
    "created_at equals updated_at for new vote",
    retrievedVote.created_at,
    retrievedVote.updated_at,
  );
}
