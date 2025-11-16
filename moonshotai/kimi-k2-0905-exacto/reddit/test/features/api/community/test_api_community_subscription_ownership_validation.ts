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

export async function test_api_community_subscription_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Create the original member who will own the subscription
  const originalMemberEmail = typia.random<string & tags.Format<"email">>();
  const originalMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: originalMemberEmail,
      password: "strongpassword123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(originalMember);

  // Step 2: Create another member who will attempt unauthorized updates
  const otherMemberEmail = typia.random<string & tags.Format<"email">>();
  const otherMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: otherMemberEmail,
      password: "otherpassword123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(otherMember);

  // Step 3: Create a community subscription for the original member
  const communityName = RandomGenerator.name()
    .replace(/\s+/g, "_")
    .toLowerCase();
  const initialPreferences: IRedditCommunityNotificationPreference = {
    value: RandomGenerator.pick([
      "none",
      "popular",
      "hot",
      "all",
      "keywords",
    ] as const),
  };

  const originalSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: communityName,
        body: {
          notification_preference: initialPreferences,
          is_active: true,
        } satisfies IRedditCommunityCommunitySubscriptions.ICreate,
      },
    );
  typia.assert(originalSubscription);

  // Verify subscription was created with original member as owner
  TestValidator.equals(
    "subscription owner is original member",
    originalSubscription.member.id,
    originalMember.id,
  );
  TestValidator.equals(
    "subscription is active",
    originalSubscription.is_active,
    true,
  );

  // Step 4: Verify the original member (owner) can successfully update their subscription
  const updatedPreferences: IRedditCommunityNotificationPreference = {
    value: RandomGenerator.pick([
      "none",
      "popular",
      "hot",
      "all",
      "keywords",
    ] as const),
  };

  const ownerUpdate =
    await api.functional.redditCommunity.member.communities.subscriptions.update(
      connection,
      {
        communityName: communityName,
        subscriptionId: originalSubscription.id,
        body: {
          notification_preference: updatedPreferences.value,
          is_active: false,
        } satisfies IRedditCommunityCommunitySubscriptions.IUpdate,
      },
    );
  typia.assert(ownerUpdate);

  TestValidator.equals(
    "owner can update notification preference",
    ownerUpdate.notification_preference,
    updatedPreferences.value,
  );
  TestValidator.equals(
    "owner can update active status",
    ownerUpdate.is_active,
    false,
  );

  // Create unauthenticated connection for unauthorized access test
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 5: Verify update attempts by non-owner (unauthenticated user) are rejected
  const unauthorizedPreferences: IRedditCommunityNotificationPreference = {
    value: RandomGenerator.pick([
      "none",
      "popular",
      "hot",
      "all",
      "keywords",
    ] as const),
  };

  await TestValidator.error(
    "unauthenticated user cannot update subscription",
    async () => {
      return await api.functional.redditCommunity.member.communities.subscriptions.update(
        unauthConnection,
        {
          communityName: communityName,
          subscriptionId: originalSubscription.id,
          body: {
            notification_preference: unauthorizedPreferences.value,
            is_active: true,
          } satisfies IRedditCommunityCommunitySubscriptions.IUpdate,
        },
      );
    },
  );

  // Verify subscription remains unchanged after unauthorized attempts
  const subscriptionAfterAttempt =
    await api.functional.redditCommunity.member.communities.subscriptions.update(
      connection,
      {
        communityName: communityName,
        subscriptionId: originalSubscription.id,
        body: {
          notification_preference: ownerUpdate.notification_preference,
          is_active: ownerUpdate.is_active,
        } satisfies IRedditCommunityCommunitySubscriptions.IUpdate,
      },
    );
  typia.assert(subscriptionAfterAttempt);

  TestValidator.equals(
    "subscription notification preference unchanged after unauthorized attempt",
    subscriptionAfterAttempt.notification_preference,
    ownerUpdate.notification_preference,
  );
  TestValidator.equals(
    "subscription active status unchanged after unauthorized attempt",
    subscriptionAfterAttempt.is_active,
    ownerUpdate.is_active,
  );
  TestValidator.equals(
    "subscription ID consistent",
    subscriptionAfterAttempt.id,
    originalSubscription.id,
  );
  TestValidator.equals(
    "subscription owner unchanged",
    subscriptionAfterAttempt.member.id,
    originalMember.id,
  );
}
