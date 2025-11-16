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

export async function test_api_community_subscription_bulk_preference_change(
  connection: api.IConnection,
) {
  // Step 1: Register as a new member to establish authentication
  const memberCredentials = {
    nickname: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
  } satisfies IRedditCommunityMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCredentials,
  });
  typia.assert(member);

  // Step 2: Create a baseline subscription with mixed preferences
  const communityName = RandomGenerator.name();
  const initialSubscription = {
    notification_preference: {
      value: RandomGenerator.pick([
        "none",
        "popular",
        "hot",
        "all",
        "keywords",
      ] as const),
    },
    is_active: RandomGenerator.pick([true, false]),
  } satisfies IRedditCommunityCommunitySubscriptions.ICreate;

  const subscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName,
        body: initialSubscription,
      },
    );
  typia.assert(subscription);

  // Step 3: Test comprehensive preference update - changing both notification preference and active status
  const comprehensiveUpdate = {
    notification_preference: RandomGenerator.pick([
      "none",
      "popular",
      "hot",
      "all",
      "keywords",
    ] as const),
    is_active: !subscription.is_active, // Flip the active status
  } satisfies IRedditCommunityCommunitySubscriptions.IUpdate;

  const updatedSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.update(
      connection,
      {
        communityName,
        subscriptionId: subscription.id,
        body: comprehensiveUpdate,
      },
    );
  typia.assert(updatedSubscription);

  // Validate comprehensive update succeeded
  TestValidator.equals(
    "notification preference updated",
    updatedSubscription.notification_preference,
    comprehensiveUpdate.notification_preference,
  );
  TestValidator.equals(
    "active status updated",
    updatedSubscription.is_active,
    comprehensiveUpdate.is_active,
  );

  // Step 4: Test partial update - only change notification preference, preserve active status
  const partialUpdatePreference = {
    notification_preference: RandomGenerator.pick([
      "none",
      "popular",
      "hot",
      "all",
      "keywords",
    ] as const),
  } satisfies IRedditCommunityCommunitySubscriptions.IUpdate;

  const partiallyUpdatedSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.update(
      connection,
      {
        communityName,
        subscriptionId: subscription.id,
        body: partialUpdatePreference,
      },
    );
  typia.assert(partiallyUpdatedSubscription);

  // Validate partial update - preference changed, active status preserved from previous update
  TestValidator.equals(
    "notification preference partially updated",
    partiallyUpdatedSubscription.notification_preference,
    partialUpdatePreference.notification_preference,
  );
  TestValidator.equals(
    "active status preserved from previous update",
    partiallyUpdatedSubscription.is_active,
    updatedSubscription.is_active,
  );

  // Step 5: Test partial update - only change active status, preserve notification preference
  const partialUpdateStatus = {
    is_active: !partiallyUpdatedSubscription.is_active,
  } satisfies IRedditCommunityCommunitySubscriptions.IUpdate;

  const statusOnlyUpdatedSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.update(
      connection,
      {
        communityName,
        subscriptionId: subscription.id,
        body: partialUpdateStatus,
      },
    );
  typia.assert(statusOnlyUpdatedSubscription);

  // Validate partial update - active status changed, notification preference preserved
  TestValidator.equals(
    "active status updated in partial update",
    statusOnlyUpdatedSubscription.is_active,
    partialUpdateStatus.is_active,
  );
  TestValidator.equals(
    "notification preference preserved from previous update",
    statusOnlyUpdatedSubscription.notification_preference,
    partiallyUpdatedSubscription.notification_preference,
  );

  // Step 6: Test edge case - update with empty object (should preserve all current settings)
  const emptyUpdate =
    {} satisfies IRedditCommunityCommunitySubscriptions.IUpdate;

  const unchangedSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.update(
      connection,
      {
        communityName,
        subscriptionId: subscription.id,
        body: emptyUpdate,
      },
    );
  typia.assert(unchangedSubscription);

  // Validate empty update preserves all settings
  TestValidator.equals(
    "subscription unchanged with empty update",
    unchangedSubscription,
    statusOnlyUpdatedSubscription,
  );
}
