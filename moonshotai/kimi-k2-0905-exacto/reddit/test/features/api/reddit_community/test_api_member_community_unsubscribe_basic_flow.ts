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

export async function test_api_member_community_unsubscribe_basic_flow(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname:
        RandomGenerator.alphabets(3).toLowerCase() +
        RandomGenerator.alphaNumeric(5),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);
  TestValidator.equals(
    "member created successfully",
    member.email,
    memberEmail,
  );

  // Step 2: Create a community for subscription testing
  const communityName =
    RandomGenerator.alphabets(5).toLowerCase() +
    RandomGenerator.alphaNumeric(3);
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        category_name: "Technology",
        type: "public",
        allow_crosspost: false,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals(
    "community created successfully",
    community.name,
    communityName,
  );

  // Step 3: Create a subscription to the community
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
  TestValidator.equals(
    "subscription created successfully",
    subscription.community.name,
    communityName,
  );
  TestValidator.predicate(
    "subscription should be active",
    subscription.is_active === true,
  );

  // Step 4: Unsubscribe/delete the subscription - this is the core operation being tested
  await api.functional.redditCommunity.member.communities.subscriptions.erase(
    connection,
    {
      communityName: community.name,
      subscriptionId: subscription.id,
    },
  );
  // The erase operation returns void on success, so we verify this completed without errors

  // Step 5: Create a new subscription to demonstrate the member can re-subscribe if desired
  // This validates that the unsubscribe operation was successful and doesn't prevent future subscriptions
  const resubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: community.name,
        body: {
          notification_preference: { value: "all" },
          is_active: true,
        } satisfies IRedditCommunityCommunitySubscriptions.ICreate,
      },
    );
  typia.assert(resubscription);
  TestValidator.equals(
    "resubscription created successfully",
    resubscription.community.name,
    communityName,
  );
  TestValidator.predicate(
    "resubscription should have different ID",
    resubscription.id !== subscription.id,
  );
}
