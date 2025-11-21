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
 * Test soft deletion of a subscription by setting the deleted_at timestamp.
 * This validates the subscription cancellation workflow where a member
 * permanently cancels their community subscription while preserving historical
 * data for analytics and preference tracking.
 */
export async function test_api_subscription_soft_deletion(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication context
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

  // 2. Create community for subscription testing
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(15),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create subscription to be soft deleted
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

  // Verify initial subscription state
  TestValidator.equals(
    "subscription should be active initially",
    subscription.status,
    "active",
  );
  TestValidator.equals(
    "member ID should match created member",
    subscription.member.id,
    member.id,
  );
  TestValidator.equals(
    "community ID should match created community",
    subscription.community.id,
    community.id,
  );
  TestValidator.predicate(
    "deleted_at should be undefined before soft deletion",
    subscription.deleted_at === undefined,
  );

  // 4. Perform soft deletion by setting deleted_at timestamp
  const softDeletedSubscription =
    await api.functional.communityPlatform.member.subscriptions.update(
      connection,
      {
        subscriptionId: subscription.id,
        body: {
          deleted_at: new Date().toISOString(),
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(softDeletedSubscription);

  // 5. Validate soft deletion results
  TestValidator.equals(
    "subscription ID should remain unchanged after soft deletion",
    softDeletedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "status should remain active after soft deletion",
    softDeletedSubscription.status,
    "active",
  );
  TestValidator.equals(
    "member reference should be preserved after soft deletion",
    softDeletedSubscription.member.id,
    member.id,
  );
  TestValidator.equals(
    "community reference should be preserved after soft deletion",
    softDeletedSubscription.community.id,
    community.id,
  );
  TestValidator.predicate(
    "deleted_at should be set after soft deletion",
    softDeletedSubscription.deleted_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at should be valid ISO string",
    typeof softDeletedSubscription.deleted_at === "string",
  );

  // Verify other timestamps remain unchanged
  TestValidator.equals(
    "created_at timestamp should be preserved",
    softDeletedSubscription.created_at,
    subscription.created_at,
  );
  TestValidator.notEquals(
    "updated_at timestamp should be different after modification",
    softDeletedSubscription.updated_at,
    subscription.updated_at,
  );

  // Comprehensive data preservation validation
  TestValidator.equals(
    "member display name should be preserved",
    softDeletedSubscription.member.display_name,
    subscription.member.display_name,
  );
  TestValidator.equals(
    "member email should be preserved",
    softDeletedSubscription.member.email,
    subscription.member.email,
  );
  TestValidator.equals(
    "community name should be preserved",
    softDeletedSubscription.community.name,
    subscription.community.name,
  );
  TestValidator.equals(
    "community slug should be preserved",
    softDeletedSubscription.community.slug,
    subscription.community.slug,
  );
}
