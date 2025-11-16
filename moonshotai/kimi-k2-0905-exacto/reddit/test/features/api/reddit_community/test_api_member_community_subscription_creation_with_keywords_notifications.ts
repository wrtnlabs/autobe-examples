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
 * Test subscription creation with 'keywords' notification preference to
 * validate the system properly handles keyword-based notification filtering and
 * subscription configurations.
 */
export async function test_api_member_community_subscription_creation_with_keywords_notifications(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        nickname: RandomGenerator.name(),
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a new community for subscription testing
  const communityName = RandomGenerator.alphaNumeric(8).toLowerCase();
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.paragraph(),
        description: RandomGenerator.content(),
        category_name: RandomGenerator.alphabets(6),
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create subscription with keywords notification preference
  const subscription: IRedditCommunityCommunitySubscriptions =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: community.name,
        body: {
          notification_preference: {
            value: "keywords",
          } satisfies IRedditCommunityNotificationPreference,
          is_active: true,
        } satisfies IRedditCommunityCommunitySubscriptions.ICreate,
      },
    );
  typia.assert(subscription);

  // 4. Validate subscription details
  TestValidator.equals(
    "subscription member ID matches authenticated member",
    subscription.member.id,
    member.id,
  );
  TestValidator.equals(
    "subscription community ID matches created community",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "notification preference is set to keywords",
    subscription.notification_preference,
    "keywords",
  );
  TestValidator.equals(
    "subscription is set to active",
    subscription.is_active,
    true,
  );
  TestValidator.predicate(
    "subscription has creation timestamp",
    subscription.subscribed_at !== undefined,
  );
  TestValidator.predicate(
    "subscription has member summary information",
    subscription.member.nickname !== undefined,
  );
  TestValidator.predicate(
    "subscription has community summary information",
    subscription.community.name !== undefined,
  );
}
