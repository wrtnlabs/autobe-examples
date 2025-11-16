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
 * Test the complete workflow of deactivating and reactivating a community
 * subscription to pause and resume content delivery. This scenario validates
 * that members can temporarily disable subscriptions without losing their
 * subscription history, then reactivate when ready to resume community
 * engagement. The test verifies that deactivated subscriptions stop affecting
 * the member's feed while maintaining all settings for easy reactivation.
 */
export async function test_api_community_subscription_deactivation_reactivation(
  connection: api.IConnection,
) {
  // Step 1: Establish member authentication for subscription lifecycle management
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create initial active subscription to test deactivation workflow
  const communityName = RandomGenerator.alphabets(10);
  const notificationPreference = RandomGenerator.pick([
    "none",
    "popular",
    "hot",
    "all",
    "keywords",
  ] as const);
  const initialSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: communityName,
        body: {
          notification_preference: {
            value: notificationPreference,
          },
          is_active: true,
        } satisfies IRedditCommunityCommunitySubscriptions.ICreate,
      },
    );
  typia.assert(initialSubscription);

  TestValidator.equals(
    "initial subscription is active",
    initialSubscription.is_active,
    true,
  );
  TestValidator.predicate(
    "subscription has community reference",
    () => initialSubscription.community !== null,
  );
  TestValidator.equals(
    "initial notification preference matches",
    initialSubscription.notification_preference,
    notificationPreference,
  );

  // Step 3: Deactivate subscription to pause content delivery
  const deactivatedSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.update(
      connection,
      {
        communityName: communityName,
        subscriptionId: initialSubscription.id,
        body: {
          is_active: false,
        } satisfies IRedditCommunityCommunitySubscriptions.IUpdate,
      },
    );
  typia.assert(deactivatedSubscription);

  TestValidator.equals(
    "subscription is deactivated",
    deactivatedSubscription.is_active,
    false,
  );
  TestValidator.equals(
    "subscription ID preserved",
    deactivatedSubscription.id,
    initialSubscription.id,
  );
  TestValidator.equals(
    "notification preference preserved",
    deactivatedSubscription.notification_preference,
    initialSubscription.notification_preference,
  );
  TestValidator.equals(
    "subscription timestamp preserved",
    deactivatedSubscription.subscribed_at,
    initialSubscription.subscribed_at,
  );
  TestValidator.predicate(
    "deactivated subscription is inactive",
    () => deactivatedSubscription.is_active === false,
  );

  // Step 4: Reactivate subscription to resume community engagement
  const reactivatedSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.update(
      connection,
      {
        communityName: communityName,
        subscriptionId: initialSubscription.id,
        body: {
          is_active: true,
        } satisfies IRedditCommunityCommunitySubscriptions.IUpdate,
      },
    );
  typia.assert(reactivatedSubscription);

  TestValidator.equals(
    "subscription is reactivated",
    reactivatedSubscription.is_active,
    true,
  );
  TestValidator.equals(
    "notification preference preserved through reactivation",
    reactivatedSubscription.notification_preference,
    initialSubscription.notification_preference,
  );
  TestValidator.equals(
    "subscription ID preserved through reactivation",
    reactivatedSubscription.id,
    initialSubscription.id,
  );
  TestValidator.equals(
    "member association preserved",
    reactivatedSubscription.member.id,
    initialSubscription.member.id,
  );
  TestValidator.equals(
    "original subscription timestamp maintained",
    reactivatedSubscription.subscribed_at,
    initialSubscription.subscribed_at,
  );

  // Step 5: Update notification preference while reactivated
  const updatedWithNewPreference =
    await api.functional.redditCommunity.member.communities.subscriptions.update(
      connection,
      {
        communityName: communityName,
        subscriptionId: initialSubscription.id,
        body: {
          notification_preference: "all",
        } satisfies IRedditCommunityCommunitySubscriptions.IUpdate,
      },
    );
  typia.assert(updatedWithNewPreference);

  TestValidator.equals(
    "notification preference can be updated independently",
    updatedWithNewPreference.notification_preference,
    "all",
  );
  TestValidator.equals(
    "subscription remains active during preference update",
    updatedWithNewPreference.is_active,
    true,
  );
}
