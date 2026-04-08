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
 * Test vote update idempotency when updating with the same vote value.
 *
 * Validates the edge case where a member updates their existing vote with the same value (upvote to upvote). This tests that the update operation is idempotent and properly refreshes the updated_at timestamp even when the vote value doesn't change.
 *
 * The test creates a complete workflow: member registration, community creation, subscription, post creation, initial vote casting, and vote update with the same value. Key validations ensure the vote value remains unchanged, the updated_at timestamp is refreshed, and the post's vote score remains stable.
 *
 * 1. Member registers and authenticates via join endpoint.
 * 2. Member creates a new community as the owner.
 * 3. Member subscribes to their own community (required for posting).
 * 4. Member creates a text post in the community.
 * 5. Member casts an initial upvote (+1) on the post.
 * 6. Member updates the vote with the same value (+1) using PUT endpoint.
 * 7. Validates vote value remains +1 after update.
 * 8. Validates updated_at timestamp is newer than created_at.
 * 9. Validates post vote score remains +1 (no net change).
 */
export async function test_api_post_vote_update_same_value(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as new member
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
      {},
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
  // 4. Create text post
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
  // 5. Cast initial upvote (+1)
  const initialVote =
    await generate_random_reddit_community_member_posts_votes_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          value: 1,
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
  typia.assert(initialVote);
  // Store initial timestamps for comparison
  const initialCreatedAt = initialVote.created_at;
  const initialUpdatedAt = initialVote.updated_at;
  // 6. Update vote with same value (+1)
  const updatedVote =
    await api.functional.redditCommunity.member.posts.votes.putByPostidAndVoteid(
      memberConnection,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: {
          value: 1,
        } satisfies IRedditCommunityPostVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 7. Verify vote value remains +1
  TestValidator.equals("vote value unchanged", updatedVote.value, 1);
  // 8. Verify updated_at timestamp is refreshed (ISO 8601 strings compare correctly with >)
  TestValidator.predicate(
    "updated_at refreshed",
    updatedVote.updated_at > initialUpdatedAt,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedVote.created_at,
    initialCreatedAt,
  );
  // 9. Verify post vote score remains +1 (from vote response's post summary)
  TestValidator.equals(
    "post vote score unchanged",
    updatedVote.post.vote_score,
    1,
  );
}
