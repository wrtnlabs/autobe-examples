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
 * Test member temporarily deactivating a community subscription without
 * permanently removing it.
 *
 * This test validates that members can set is_active to false to stop receiving
 * community content while preserving their subscription history. The
 * subscription remains in the system but becomes inactive, allowing members to
 * reactivate later without losing their notification preferences or
 * subscription metadata.
 *
 * The workflow tests the complete lifecycle of subscription deactivation and
 * reactivation:
 *
 * 1. Member registration and authentication setup
 * 2. Community creation for testing
 * 3. Initial subscription creation with specific preferences
 * 4. Deactivation of the subscription (is_active: false)
 * 5. Verification of deactivation state
 * 6. Reactivation of the subscription
 * 7. Final validation ensuring preferences are preserved
 *
 * Key validation points:
 *
 * - Subscription can be deactivated without being deleted
 * - Notification preferences remain intact during deactivation
 * - Subscription can be reactivated later
 * - All subscription metadata is preserved throughout the process
 */
export async function test_api_community_subscription_deactivation(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123!",
        nickname: RandomGenerator.name(),
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a test community
  const communityName = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.paragraph(),
        description: RandomGenerator.content(),
        category_name: "Technology",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create an active subscription with specific notification preferences
  const notificationPreference: IRedditCommunityNotificationPreference = {
    value: "hot",
  };
  const subscription: IRedditCommunityCommunitySubscriptions =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: community.name,
        body: {
          notification_preference: notificationPreference,
          is_active: true,
        } satisfies IRedditCommunityCommunitySubscriptions.ICreate,
      },
    );
  typia.assert(subscription);

  // Validate initial subscription state
  TestValidator.equals(
    "subscription should be active initially",
    subscription.is_active,
    true,
  );
  TestValidator.equals(
    "notification preference should match",
    subscription.notification_preference,
    notificationPreference.value,
  );

  // Step 4: Deactivate the subscription by setting is_active to false
  const deactivatedSubscription: IRedditCommunityCommunitySubscriptions =
    await api.functional.redditCommunity.member.communities.subscriptions.updateSubscription(
      connection,
      {
        communityName: community.name,
        body: {
          is_active: false,
        } satisfies IRedditCommunityCommunitySubscriptions.IUpdate,
      },
    );
  typia.assert(deactivatedSubscription);

  // Step 5: Verify the subscription is deactivated but preferences are preserved
  TestValidator.equals(
    "subscription should be deactivated",
    deactivatedSubscription.is_active,
    false,
  );
  TestValidator.equals(
    "notification preference should be preserved",
    deactivatedSubscription.notification_preference,
    notificationPreference.value,
  );
  TestValidator.equals(
    "subscription ID should remain the same",
    deactivatedSubscription.id,
    subscription.id,
  );

  // Step 6: Reactivate the subscription
  const reactivatedSubscription: IRedditCommunityCommunitySubscriptions =
    await api.functional.redditCommunity.member.communities.subscriptions.updateSubscription(
      connection,
      {
        communityName: community.name,
        body: {
          is_active: true,
        } satisfies IRedditCommunityCommunitySubscriptions.IUpdate,
      },
    );
  typia.assert(reactivatedSubscription);

  // Step 7: Validate final state - subscription should be active with original preferences
  TestValidator.equals(
    "subscription should be reactivated",
    reactivatedSubscription.is_active,
    true,
  );
  TestValidator.equals(
    "notification preference should remain unchanged",
    reactivatedSubscription.notification_preference,
    notificationPreference.value,
  );
  TestValidator.equals(
    "all subscription data should match after reactivation",
    reactivatedSubscription.id,
    subscription.id,
  );
}
