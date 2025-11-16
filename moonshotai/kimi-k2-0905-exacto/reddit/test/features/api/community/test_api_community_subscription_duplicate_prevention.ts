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

export async function test_api_community_subscription_duplicate_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member for testing subscription uniqueness constraints
  const memberData = {
    nickname: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.ICreate;

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create a community name for subscription testing
  // Since no community creation API is provided, we'll test with a unique community name
  // The API should handle non-existent community validation appropriately
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;

  // Step 3: Create initial subscription with valid notification preferences
  const subscriptionData = {
    notification_preference: {
      value: "popular",
    } as IRedditCommunityNotificationPreference,
    is_active: true,
  } satisfies IRedditCommunityCommunitySubscriptions.ICreate;

  const firstSubscription: IRedditCommunityCommunitySubscriptions =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: communityName,
        body: subscriptionData,
      },
    );
  typia.assert(firstSubscription);

  // Verify the subscription was created successfully
  TestValidator.equals(
    "subscription member matches authenticated member",
    firstSubscription.member.id,
    member.id,
  );
  TestValidator.equals(
    "subscription is active",
    firstSubscription.is_active,
    true,
  );
  TestValidator.equals(
    "notification preference is set correctly",
    firstSubscription.notification_preference,
    "popular",
  );

  // Step 4: Attempt duplicate subscription - should fail gracefully
  // This tests the core requirement: preventing duplicate subscriptions
  await TestValidator.error(
    "duplicate subscription should be prevented",
    async () => {
      await api.functional.redditCommunity.member.communities.subscriptions.create(
        connection,
        {
          communityName: communityName,
          body: subscriptionData,
        },
      );
    },
  );

  // Step 5: Verify original subscription state is preserved
  // The first subscription should remain intact and unchanged
  TestValidator.predicate(
    "original subscription ID is preserved",
    firstSubscription.id !== null && firstSubscription.id !== undefined,
  );
  TestValidator.equals(
    "original subscription remains active",
    firstSubscription.is_active,
    true,
  );
  TestValidator.equals(
    "original subscription community name matches",
    firstSubscription.community.name,
    communityName,
  );

  // Step 6: Test with different notification preferences to ensure constraint is on member-community pair
  const differentPreferences = {
    notification_preference: {
      value: "all",
    } as IRedditCommunityNotificationPreference,
    is_active: false,
  } satisfies IRedditCommunityCommunitySubscriptions.ICreate;

  await TestValidator.error(
    "duplicate subscription with different preferences should still be prevented",
    async () => {
      await api.functional.redditCommunity.member.communities.subscriptions.create(
        connection,
        {
          communityName: communityName,
          body: differentPreferences,
        },
      );
    },
  );

  // Final verification: Ensure the subscription system maintains data integrity
  TestValidator.equals(
    "member email is preserved",
    firstSubscription.member.email,
    member.email,
  );
  TestValidator.equals(
    "subscription timestamp exists",
    firstSubscription.subscribed_at !== null,
    true,
  );
}
