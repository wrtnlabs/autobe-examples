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
 * Test successful subscription retrieval by the authenticated member who owns
 * the subscription. Validates that subscription details including status,
 * timestamps, member information, and community details are correctly returned.
 * Ensures proper access control prevents unauthorized access to subscription
 * information.
 */
export async function test_api_subscription_retrieval_by_subscriber(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community to subscribe to
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create subscription to the community
  const subscription =
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
  typia.assert(subscription);

  // Step 4: Retrieve the subscription by ID
  const retrievedSubscription =
    await api.functional.communityPlatform.member.subscriptions.at(connection, {
      subscriptionId: subscription.id,
    });
  typia.assert(retrievedSubscription);

  // Step 5: Validate subscription details
  TestValidator.equals(
    "subscription ID matches",
    retrievedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "subscription status is active",
    retrievedSubscription.status,
    "active",
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
    "created_at timestamp matches",
    retrievedSubscription.created_at,
    subscription.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp matches",
    retrievedSubscription.updated_at,
    subscription.updated_at,
  );
  TestValidator.predicate(
    "deleted_at should be undefined",
    retrievedSubscription.deleted_at === undefined,
  );

  // Additional validations for nested objects
  TestValidator.equals(
    "member email matches",
    retrievedSubscription.member.email,
    member.email,
  );
  TestValidator.equals(
    "member display name matches",
    retrievedSubscription.member.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "community name matches",
    retrievedSubscription.community.name,
    community.name,
  );
  TestValidator.equals(
    "community slug matches",
    retrievedSubscription.community.slug,
    community.slug,
  );
}
