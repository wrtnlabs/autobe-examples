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
 * Test updating a member's subscription status from active to inactive.
 *
 * This validates the subscription management workflow where a member
 * temporarily pauses their community subscription while preserving the
 * subscription relationship. The scenario tests proper status transition logic
 * and ensures the member can only update their own subscriptions.
 */
export async function test_api_subscription_status_update_active_to_inactive(
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
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community for subscription
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

  // Step 3: Create initial active subscription
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
  TestValidator.equals(
    "initial subscription status should be active",
    subscription.status,
    "active",
  );

  // Step 4: Update subscription status from active to inactive
  const updatedSubscription =
    await api.functional.communityPlatform.member.subscriptions.update(
      connection,
      {
        subscriptionId: subscription.id,
        body: {
          status: "inactive",
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(updatedSubscription);

  // Step 5: Validate the status transition
  TestValidator.equals(
    "subscription status should be updated to inactive",
    updatedSubscription.status,
    "inactive",
  );
  TestValidator.equals(
    "member reference should remain unchanged",
    updatedSubscription.member.id,
    member.id,
  );
  TestValidator.equals(
    "community reference should remain unchanged",
    updatedSubscription.community.id,
    community.id,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedSubscription.updated_at,
    subscription.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedSubscription.created_at,
    subscription.created_at,
  );
}
