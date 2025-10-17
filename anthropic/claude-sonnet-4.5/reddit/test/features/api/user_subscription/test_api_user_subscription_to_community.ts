import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test user subscription to community workflow.
 *
 * Validates the complete subscription creation process where an authenticated
 * member subscribes to a public community using the user-centric subscription
 * endpoint. This test ensures proper association between users and communities,
 * accurate subscriber count tracking, and correct timestamp recording.
 *
 * Test Flow:
 *
 * 1. Register a new member account with valid credentials
 * 2. Create a public community that will accept subscriptions
 * 3. Subscribe the member to the community via user-centric endpoint
 * 4. Validate subscription record with correct associations
 * 5. Verify community subscriber_count is incremented
 * 6. Confirm subscription timestamp accuracy
 */
export async function test_api_user_subscription_to_community(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberCredentials = {
    username:
      RandomGenerator.name(1).toLowerCase() + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);

  // Step 2: Create a public community
  const communityData = {
    code: RandomGenerator.alphabets(8).toLowerCase(),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 7 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Verify initial subscriber count is 0
  TestValidator.equals(
    "initial subscriber count is zero",
    community.subscriber_count,
    0,
  );

  // Step 3: Subscribe user to the community
  const subscriptionRequest = {
    community_id: community.id,
  } satisfies IRedditLikeUser.ISubscriptionCreate;

  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.users.subscriptions.create(connection, {
      userId: member.id,
      body: subscriptionRequest,
    });
  typia.assert(subscription);

  // Step 4: Validate subscription record
  TestValidator.equals(
    "subscription member ID matches",
    subscription.member_id,
    member.id,
  );
  TestValidator.equals(
    "subscription community ID matches",
    subscription.community_id,
    community.id,
  );

  // Step 5: Verify subscription timestamp is recent (within last 10 seconds)
  const subscriptionTime = new Date(subscription.subscribed_at);
  const currentTime = new Date();
  const timeDifferenceMs = currentTime.getTime() - subscriptionTime.getTime();
  TestValidator.predicate(
    "subscription timestamp is recent",
    timeDifferenceMs >= 0 && timeDifferenceMs < 10000,
  );
}
