import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * Comprehensive test for subscription retrieval across different status
 * scenarios (active, inactive, pending). This test validates that subscription
 * information is accessible regardless of status and that status-specific
 * details are correctly represented in the response.
 */
export async function test_api_subscription_retrieval_with_different_statuses(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community for subscription target
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Test active subscription retrieval
  const activeSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_community_id: community.id,
          status: "active",
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(activeSubscription);

  // Retrieve and validate active subscription
  const retrievedActive =
    await api.functional.communityPlatform.member.subscriptions.at(connection, {
      subscriptionId: activeSubscription.id,
    });
  typia.assert(retrievedActive);
  TestValidator.equals(
    "active subscription status matches",
    retrievedActive.status,
    "active",
  );
  TestValidator.equals(
    "active subscription member ID matches",
    retrievedActive.member.id,
    member.id,
  );
  TestValidator.equals(
    "active subscription community ID matches",
    retrievedActive.community.id,
    community.id,
  );

  // Step 4: Test inactive subscription retrieval
  const inactiveSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_community_id: community.id,
          status: "inactive",
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(inactiveSubscription);

  // Retrieve and validate inactive subscription
  const retrievedInactive =
    await api.functional.communityPlatform.member.subscriptions.at(connection, {
      subscriptionId: inactiveSubscription.id,
    });
  typia.assert(retrievedInactive);
  TestValidator.equals(
    "inactive subscription status matches",
    retrievedInactive.status,
    "inactive",
  );
  TestValidator.equals(
    "inactive subscription member ID matches",
    retrievedInactive.member.id,
    member.id,
  );
  TestValidator.equals(
    "inactive subscription community ID matches",
    retrievedInactive.community.id,
    community.id,
  );

  // Step 5: Test pending subscription retrieval
  const pendingSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_community_id: community.id,
          status: "pending",
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(pendingSubscription);

  // Retrieve and validate pending subscription
  const retrievedPending =
    await api.functional.communityPlatform.member.subscriptions.at(connection, {
      subscriptionId: pendingSubscription.id,
    });
  typia.assert(retrievedPending);
  TestValidator.equals(
    "pending subscription status matches",
    retrievedPending.status,
    "pending",
  );
  TestValidator.equals(
    "pending subscription member ID matches",
    retrievedPending.member.id,
    member.id,
  );
  TestValidator.equals(
    "pending subscription community ID matches",
    retrievedPending.community.id,
    community.id,
  );

  // Step 6: Validate subscription timestamps and relationships
  const allSubscriptions = [
    retrievedActive,
    retrievedInactive,
    retrievedPending,
  ];

  for (const subscription of allSubscriptions) {
    TestValidator.predicate(
      "subscription has valid created_at timestamp",
      subscription.created_at !== null && subscription.created_at !== undefined,
    );
    TestValidator.predicate(
      "subscription has valid updated_at timestamp",
      subscription.updated_at !== null && subscription.updated_at !== undefined,
    );
    TestValidator.equals(
      "subscription member email matches",
      subscription.member.email,
      member.email,
    );
    TestValidator.equals(
      "subscription community name matches",
      subscription.community.name,
      community.name,
    );
  }
}
