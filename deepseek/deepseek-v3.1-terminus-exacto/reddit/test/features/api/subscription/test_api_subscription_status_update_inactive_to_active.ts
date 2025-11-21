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
 * Test updating a member's subscription status from inactive to active.
 *
 * This test validates the subscription reactivation workflow where a member
 * resumes their community subscription after a temporary pause. The scenario
 * tests status transition validation and ensures proper subscription lifecycle
 * management.
 *
 * Implementation steps:
 *
 * 1. Create member account for authentication
 * 2. Create community for subscription testing
 * 3. Create initial inactive subscription
 * 4. Update subscription status to active
 * 5. Validate status transition and lifecycle management
 */
export async function test_api_subscription_status_update_inactive_to_active(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "Password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community for subscription testing
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create initial inactive subscription
  const initialSubscription: ICommunityPlatformSubscription =
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
  typia.assert(initialSubscription);
  TestValidator.equals(
    "initial subscription status should be inactive",
    initialSubscription.status,
    "inactive",
  );

  // Step 4: Update subscription status to active
  const updatedSubscription: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.update(
      connection,
      {
        subscriptionId: initialSubscription.id,
        body: {
          status: "active",
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(updatedSubscription);

  // Step 5: Validate status transition and lifecycle management
  TestValidator.equals(
    "subscription status should be updated to active",
    updatedSubscription.status,
    "active",
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    initialSubscription.updated_at,
    updatedSubscription.updated_at,
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
  TestValidator.equals(
    "subscription ID should remain unchanged",
    updatedSubscription.id,
    initialSubscription.id,
  );
}
