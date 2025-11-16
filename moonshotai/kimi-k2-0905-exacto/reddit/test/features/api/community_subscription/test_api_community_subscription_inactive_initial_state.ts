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
 * Test creating a community subscription with initial inactive state that
 * requires manual activation. Validates that members can create subscriptions
 * that don't immediately affect their content feed, useful for organizing
 * future community interests. The test should verify that inactive
 * subscriptions are properly tracked without affecting the member's
 * personalized feed algorithm, and that the subscription can be activated later
 * through the update operation.
 */
export async function test_api_community_subscription_inactive_initial_state(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const nickname = RandomGenerator.name();
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname,
      email,
      password,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a new community subscription with inactive initial state
  const communityName = RandomGenerator.name();
  const notificationPreference: IRedditCommunityNotificationPreference = {
    value: RandomGenerator.pick([
      "none",
      "popular",
      "hot",
      "all",
      "keywords",
    ] as const),
  };

  const subscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName,
        body: {
          notification_preference: notificationPreference,
          is_active: false, // Explicitly create inactive subscription
        } satisfies IRedditCommunityCommunitySubscriptions.ICreate,
      },
    );
  typia.assert(subscription);

  // Step 3: Verify the subscription was created with inactive state
  TestValidator.equals("subscription ID exists", !!subscription.id, true);
  TestValidator.equals(
    "subscription member matches",
    subscription.member.id,
    member.id,
  );
  TestValidator.equals(
    "subscription member nickname matches",
    subscription.member.nickname,
    member.nickname,
  );
  TestValidator.equals(
    "subscription member email matches",
    subscription.member.email,
    member.email,
  );

  // Step 4: Verify the inactive state and initial configuration
  TestValidator.equals(
    "subscription is inactive by default",
    subscription.is_active,
    false,
  );
  TestValidator.equals(
    "community name matches",
    subscription.community.name,
    communityName,
  );
  TestValidator.equals(
    "notification preference matches",
    subscription.notification_preference,
    notificationPreference.value,
  );

  // Step 5: Verify temporal properties are set correctly
  TestValidator.predicate(
    "subscribed_at is valid date string",
    !isNaN(Date.parse(subscription.subscribed_at)),
  );
  TestValidator.equals(
    "last_notification_sent is undefined for inactive subscription",
    subscription.last_notification_sent,
    undefined,
  );
}
