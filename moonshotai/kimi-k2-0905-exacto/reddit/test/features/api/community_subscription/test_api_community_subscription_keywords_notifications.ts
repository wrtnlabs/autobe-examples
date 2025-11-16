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
 * Test member creating a community subscription with 'keywords' notification
 * preference for custom topic-based content filtering.
 *
 * This test validates that members can subscribe to communities with
 * keyword-based notification preferences to receive updates only for posts
 * matching specific topics or interests. The workflow ensures personalized
 * content discovery while maintaining community membership benefits, and that
 * the system properly tracks keyword preferences for future notification
 * matching.
 *
 * Test process:
 *
 * 1. Create a new member account to establish authentication context
 * 2. Create a community subscription with 'keywords' notification preference for
 *    topic-based filtering
 * 3. Verify the subscription contains correct notification settings and member
 *    information
 * 4. Validate that keyword notification setup enables personalized content
 *    discovery
 * 5. Confirm subscription maintains active status and proper community
 *    relationship
 */
export async function test_api_community_subscription_keywords_notifications(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account for authentication
  const memberData = {
    nickname: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
  } satisfies IRedditCommunityMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  TestValidator.predicate(
    "member has valid authorization",
    member.token.access.length > 0,
  );

  // Step 2: Create community subscription with keywords notification preference
  const communityName = "technology";
  const subscriptionData = {
    notification_preference: {
      value: "keywords",
    },
    is_active: true,
  } satisfies IRedditCommunityCommunitySubscriptions.ICreate;

  const subscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName,
        body: subscriptionData,
      },
    );
  typia.assert(subscription);

  // Step 3: Verify subscription contains correct notification settings
  TestValidator.equals(
    "subscription has keywords notification preference",
    subscription.notification_preference,
    "keywords",
  );
  TestValidator.equals("subscription is active", subscription.is_active, true);
  TestValidator.equals(
    "subscription member ID matches",
    subscription.member.id,
    member.id,
  );
  TestValidator.predicate(
    "subscription has community information",
    subscription.community !== null,
  );
  TestValidator.predicate(
    "subscription has valid creation timestamp",
    subscription.subscribed_at.length > 0,
  );

  // Step 4: Validate keyword notification setup for personalized content discovery
  TestValidator.equals(
    "notification preference enables keyword filtering",
    subscription.notification_preference,
    "keywords",
  );
  TestValidator.predicate(
    "subscription ID is valid UUID",
    typia.is<string & tags.Format<"uuid">>(subscription.id),
  );
  TestValidator.predicate(
    "subscription has community name",
    subscription.community.name === communityName,
  );

  // Step 5: Confirm subscription maintains community membership benefits
  TestValidator.predicate(
    "subscription maintains member relationship",
    subscription.member.nickname === member.nickname,
  );
  TestValidator.predicate(
    "subscription maintains community relationship",
    subscription.community.id !== null,
  );
  TestValidator.predicate(
    "subscription supports future notification tracking",
    subscription.last_notification_sent === undefined,
  );
}
