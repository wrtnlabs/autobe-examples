import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * Test authorization validation for subscription deletion operations.
 *
 * This scenario validates that only administrators with proper privileges can
 * perform hard deletion of subscription records, preventing unauthorized access
 * to administrative functions. The test creates multiple user accounts (member
 * and admin) to verify proper authorization boundaries and ensure that regular
 * members cannot perform administrative subscription deletion.
 */
export async function test_api_admin_subscription_deletion_authorization(
  connection: api.IConnection,
) {
  // Create a regular member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "memberPassword123";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Create a community for subscription testing
  const community: ICommunityPlatformCommunity =
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

  // Create a subscription to test unauthorized deletion
  const subscription: ICommunityPlatformSubscription =
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

  // Test that regular members cannot delete subscriptions
  await TestValidator.error(
    "regular member should not be able to delete subscriptions",
    async () => {
      await api.functional.communityPlatform.admin.subscriptions.erase(
        connection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );

  // Create an admin account with proper privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPassword123";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Switch to admin account
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "test-agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Test that administrators can successfully delete subscriptions
  await api.functional.communityPlatform.admin.subscriptions.erase(connection, {
    subscriptionId: subscription.id,
  });

  // The subscription deletion is complete - no further deletion attempts needed
  // as the subscription should no longer exist in the system
}
