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
 * Test updating community subscription notification preferences
 *
 * This test validates the complete workflow for updating a member's community
 * subscription notification settings. It demonstrates how members can modify
 * their notification preferences to control the frequency and type of updates
 * they receive from communities they've subscribed to.
 *
 * The test follows this business flow:
 *
 * 1. Register a new member account to establish authentication
 * 2. Create a community subscription with initial 'all' notification preference
 * 3. Update the subscription to change notification preference to 'popular'
 * 4. Verify the update was successful and notification preference changed
 * 5. Validate that other subscription properties remain unchanged
 * 6. Test updating other subscription properties like is_active status
 *
 * This scenario is important for user experience as it allows members to
 * personalize their notification experience based on their engagement
 * preferences and reduce notification overload by switching to less frequent
 * updates.
 */
export async function test_api_community_subscription_update_notification_preferences(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  typia.assert(member);

  // Step 2: Create a community subscription with 'all' notification preference
  const communityName = RandomGenerator.name(1);
  const initialSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName,
        body: {
          notification_preference: { value: "all" },
          is_active: true,
        },
      },
    );
  typia.assert(initialSubscription);

  // Validate initial subscription state
  TestValidator.equals(
    "initial subscription id exists",
    typeof initialSubscription.id,
    "string",
  );
  TestValidator.equals(
    "initial notification preference is all",
    initialSubscription.notification_preference,
    "all",
  );
  TestValidator.equals(
    "initial subscription is active",
    initialSubscription.is_active,
    true,
  );

  // Step 3: Update subscription to change notification preference to 'popular'
  const updatedSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.update(
      connection,
      {
        communityName,
        subscriptionId: initialSubscription.id,
        body: {
          notification_preference: "popular",
        },
      },
    );
  typia.assert(updatedSubscription);

  // Step 4: Validate the update was successful
  TestValidator.equals(
    "subscription id remains same",
    updatedSubscription.id,
    initialSubscription.id,
  );
  TestValidator.equals(
    "notification preference updated to popular",
    updatedSubscription.notification_preference,
    "popular",
  );
  TestValidator.equals(
    "subscription remains active",
    updatedSubscription.is_active,
    true,
  );
  TestValidator.equals(
    "member information preserved",
    updatedSubscription.member.id,
    initialSubscription.member.id,
  );
  TestValidator.equals(
    "community information preserved",
    updatedSubscription.community.id,
    initialSubscription.community.id,
  );

  // Step 5: Test updating multiple properties at once
  const multiUpdateSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.update(
      connection,
      {
        communityName,
        subscriptionId: initialSubscription.id,
        body: {
          notification_preference: "hot",
          is_active: false,
        },
      },
    );
  typia.assert(multiUpdateSubscription);

  TestValidator.equals(
    "notification preference updated to hot",
    multiUpdateSubscription.notification_preference,
    "hot",
  );
  TestValidator.equals(
    "subscription deactivated",
    multiUpdateSubscription.is_active,
    false,
  );

  // Step 6: Test updating subscription status back to active
  const reactivatedSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.update(
      connection,
      {
        communityName,
        subscriptionId: initialSubscription.id,
        body: {
          is_active: true,
        },
      },
    );
  typia.assert(reactivatedSubscription);

  TestValidator.equals(
    "subscription reactivated",
    reactivatedSubscription.is_active,
    true,
  );
  TestValidator.equals(
    "notification preference remains hot",
    reactivatedSubscription.notification_preference,
    "hot",
  );
}
