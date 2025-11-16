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
 * Test the basic community subscription creation workflow including
 * authentication, community creation, and successful subscription with
 * different notification preferences to validate the complete subscription flow
 * works correctly.
 *
 * This comprehensive test validates the complete subscription lifecycle:
 *
 * 1. Member registration with random valid credentials
 * 2. Community creation with random name, title, description, and category
 * 3. Multiple subscription attempts with different notification preferences (none,
 *    popular, hot, all, keywords)
 * 4. Validation of subscription data integrity and relationships
 * 5. Verification of subscription status and timestamps
 */
export async function test_api_member_community_subscription_creation_basic_flow(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    nickname: RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase(),
    email: memberEmail,
    password: "SecurePass123!",
  } satisfies IRedditCommunityMember.ICreate;

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create a community for subscription testing
  const communityName = RandomGenerator.alphaNumeric(8).toLowerCase();
  const communityData = {
    name: communityName,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category_name: "technology",
    type: "public" as const,
    allow_crosspost: true,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Test subscription with different notification preferences
  const notificationPreferences: IRedditCommunityNotificationPreference["value"][] =
    ["none", "popular", "hot", "all", "keywords"];

  const subscriptions: IRedditCommunityCommunitySubscriptions[] = [];

  for (const preference of notificationPreferences) {
    const subscriptionData = {
      notification_preference: { value: preference },
      is_active: true,
    } satisfies IRedditCommunityCommunitySubscriptions.ICreate;

    const subscription: IRedditCommunityCommunitySubscriptions =
      await api.functional.redditCommunity.member.communities.subscriptions.create(
        connection,
        {
          communityName: community.name,
          body: subscriptionData,
        },
      );
    typia.assert(subscription);

    subscriptions.push(subscription);

    // Validate subscription data integrity
    TestValidator.equals(
      "member ID matches",
      subscription.member.id,
      member.id,
    );
    TestValidator.equals(
      "community ID matches",
      subscription.community.id,
      community.id,
    );
    TestValidator.equals(
      "notification preference",
      subscription.notification_preference,
      preference,
    );
    TestValidator.equals(
      "subscription is active",
      subscription.is_active,
      true,
    );
    TestValidator.predicate(
      "has subscribed_at timestamp",
      subscription.subscribed_at !== undefined,
    );
    TestValidator.equals(
      "member nickname matches",
      subscription.member.nickname,
      member.nickname,
    );
    TestValidator.equals(
      "community name matches",
      subscription.community.name,
      community.name,
    );
  }

  // Final validation: ensure all preferences were tested
  TestValidator.equals(
    "all notification preferences tested",
    subscriptions.length,
    notificationPreferences.length,
  );
  TestValidator.predicate(
    "each preference is unique",
    () =>
      new Set(subscriptions.map((s) => s.notification_preference)).size ===
      subscriptions.length,
  );
}
