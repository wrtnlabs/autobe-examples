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
 * Test member updating notification preferences for an existing community
 * subscription.
 *
 * This test validates the complete subscription preference update workflow:
 *
 * 1. Creates a new member account with authentication
 * 2. Creates a new community for subscription testing
 * 3. Creates initial subscription with 'all' notifications
 * 4. Updates subscription to change notification from 'all' to 'popular'
 * 5. Verifies updated preferences are properly stored
 *
 * The test ensures members can control their notification frequency and that
 * preference changes are accurately reflected in system responses.
 */
export async function test_api_community_subscription_notification_preferences_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a new community
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(8),
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 3,
          wordMax: 8,
        }),
        category_name: "technology",
        type: "public",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create initial subscription with 'all' notifications
  const initialSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: community.name,
        body: {
          notification_preference: {
            value: "all",
          } satisfies IRedditCommunityNotificationPreference,
          is_active: true,
        } satisfies IRedditCommunityCommunitySubscriptions.ICreate,
      },
    );
  typia.assert(initialSubscription);

  // Verify initial state
  TestValidator.equals(
    "initial notification preference",
    initialSubscription.notification_preference,
    "all",
  );
  TestValidator.equals(
    "initial active status",
    initialSubscription.is_active,
    true,
  );

  // Step 4: Update notification preference to 'popular'
  const updatedSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.updateSubscription(
      connection,
      {
        communityName: community.name,
        body: {
          notification_preference: "popular",
        } satisfies IRedditCommunityCommunitySubscriptions.IUpdate,
      },
    );
  typia.assert(updatedSubscription);

  // Step 5: Verify updated preferences
  TestValidator.equals(
    "updated notification preference",
    updatedSubscription.notification_preference,
    "popular",
  );
  TestValidator.equals(
    "updated active status",
    updatedSubscription.is_active,
    true,
  );
  TestValidator.equals(
    "subscription ID consistency",
    updatedSubscription.id,
    initialSubscription.id,
  );
  TestValidator.equals(
    "community consistency",
    updatedSubscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "member consistency",
    updatedSubscription.member.id,
    member.id,
  );
}
