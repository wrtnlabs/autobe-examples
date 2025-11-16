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

export async function test_api_member_community_unsubscribe_notifications_disabled(
  connection: api.IConnection,
) {
  // 1. Create a member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphabets(8),
      email: memberEmail,
      password: "testPassword123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a community for subscription testing
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_name: "technology",
        type: "public",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create a subscription with "none" notification preference
  const subscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: community.name,
        body: {
          notification_preference: {
            value: "none",
          } satisfies IRedditCommunityNotificationPreference,
          is_active: true,
        } satisfies IRedditCommunityCommunitySubscriptions.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription has none notification preference",
    subscription.notification_preference,
    "none",
  );
  TestValidator.equals("subscription is active", subscription.is_active, true);

  // 4. Unsubscribe from the community (delete the subscription)
  await api.functional.redditCommunity.member.communities.subscriptions.erase(
    connection,
    {
      communityName: community.name,
      subscriptionId: subscription.id,
    },
  );

  // 5. Verify the subscription was successfully deleted by attempting to delete again (should fail)
  await TestValidator.error(
    "deleting non-existent subscription should fail",
    async () => {
      await api.functional.redditCommunity.member.communities.subscriptions.erase(
        connection,
        {
          communityName: community.name,
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
