import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunitySubscriptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscriptions";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotificationPreference";

/**
 * Test creating a subscription with 'popular' notification preference to
 * validate the system correctly handles different notification levels and
 * properly stores subscriber preferences.
 *
 * This test validates the community subscription creation process, specifically
 * focusing on notification preference handling:
 *
 * 1. First creates a member account for authentication
 * 2. Creates a new community to subscribe to
 * 3. Subscribes to the community with 'popular' notification preference
 * 4. Validates the subscription response contains correct information
 * 5. Verifies notification preference is set to 'popular' (top 1% by engagement)
 * 6. Confirms subscription is active and properly linked to member and community
 *
 * The test ensures the system correctly handles subscription creation with
 * various notification levels and properly stores subscriber preferences for
 * personalized feed customization.
 */
export async function test_api_member_community_subscription_creation_with_popular_notifications(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberRegistration = {
    nickname: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123",
  } satisfies IRedditCommunityMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberRegistration,
  });
  typia.assert(member);

  // Step 2: Create a community to subscribe to
  const communityData = {
    name: RandomGenerator.alphabets(5).toLowerCase(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category_name: "Technology",
    type: "public" as const,
    allow_crosspost: true,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Subscribe to community with "popular" notification preference
  const subscriptionPreference = {
    notification_preference: {
      value: "popular" as const,
    },
    is_active: true,
  } satisfies IRedditCommunityCommunitySubscriptions.ICreate;

  const subscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: community.name,
        body: subscriptionPreference,
      },
    );
  typia.assert(subscription);

  // Step 4: Validate subscription data integrity
  TestValidator.equals(
    "subscription member matches created member",
    subscription.member.id,
    member.id,
  );
  TestValidator.equals(
    "subscription community matches created community",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "notification preference set to popular",
    subscription.notification_preference,
    "popular",
  );
  TestValidator.equals("subscription is active", subscription.is_active, true);
  TestValidator.predicate(
    "subscription has subscribed_at timestamp",
    typeof subscription.subscribed_at === "string",
  );
  TestValidator.predicate(
    "subscription id is UUID format",
    typeof subscription.id === "string" && subscription.id.length === 36,
  );
}
