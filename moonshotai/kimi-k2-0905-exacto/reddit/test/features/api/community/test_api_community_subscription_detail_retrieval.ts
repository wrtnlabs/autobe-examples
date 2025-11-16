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

export async function test_api_community_subscription_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Create authenticated member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 2. Create community to subscribe to
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_name: "Technology",
        type: "public",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Subscribe to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: community.name,
        body: {
          notification_preference: { value: "popular" },
          is_active: true,
        } satisfies IRedditCommunityCommunitySubscriptions.ICreate,
      },
    );
  typia.assert(subscription);

  // 4. Retrieve subscription details
  const retrievedSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.getSubscription(
      connection,
      {
        communityName: community.name,
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrievedSubscription);

  // 5. Validate retrieved subscription details
  TestValidator.equals(
    "subscription ID matches",
    retrievedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedSubscription.member.id,
    member.id,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedSubscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "notification preference matches",
    retrievedSubscription.notification_preference,
    "popular",
  );
  TestValidator.equals(
    "subscription status matches",
    retrievedSubscription.is_active,
    true,
  );
  TestValidator.equals(
    "member email matches",
    retrievedSubscription.member.email,
    member.email,
  );
  TestValidator.equals(
    "member nickname matches",
    retrievedSubscription.member.nickname,
    member.nickname,
  );
  TestValidator.equals(
    "community name matches",
    retrievedSubscription.community.name,
    community.name,
  );
}
