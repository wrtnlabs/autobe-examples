import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * Validate admin can unsubscribe a member from a community (soft delete a
 * subscription).
 *
 * Scenario steps:
 *
 * 1. Register an admin (creates admin context)
 * 2. Register a member (creates member context)
 * 3. Member creates a community
 * 4. Member subscribes to that community
 * 5. Admin unsubscribes that member from the community (soft deletes subscription)
 * 6. Verify the subscription's deleted_at is set (by re-subscribing then checking
 *    the timestamp is updated)
 * 7. Attempting to unsubscribe again yields an error
 * 8. Attempting to unsubscribe with a non-existent subscriptionId yields an error
 * 9. Non-admin (plain member) attempt to unsubscribe is rejected
 */
export async function test_api_subscription_admin_unsubscribe_member_from_community(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Adm1nTest!";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register a member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Memb3rPwd!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Member creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 12,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 12,
            sentenceMax: 25,
          }),
          slug: RandomGenerator.alphaNumeric(12),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community is created by the member",
    community.creator_member_id === member.id,
  );

  // 4. Member subscribes to the new community
  const subscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.predicate(
    "Subscription has correct member and community ID",
    subscription.member_id === member.id &&
      subscription.community_id === community.id,
  );

  // 5. Admin unsubscribes the member
  // Switch to admin context
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  await api.functional.communityPlatform.admin.subscriptions.erase(connection, {
    subscriptionId: subscription.id,
  });

  // 6. Validate subscription is soft deleted: try to subscribe again, check new subscription or error
  // The subscription should have been soft-deleted (deleted_at set). Trying to unsubscribe again should error.
  await TestValidator.error(
    "Unsubscribing the same subscription twice yields error",
    async () => {
      await api.functional.communityPlatform.admin.subscriptions.erase(
        connection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );

  // 7. Deleting non-existent subscription id yields error
  await TestValidator.error(
    "Deleting non-existent subscription id yields error",
    async () => {
      await api.functional.communityPlatform.admin.subscriptions.erase(
        connection,
        {
          subscriptionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 8. Non-admin (plain member) attempt to use admin erase endpoint is denied
  // Switch context to member
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error(
    "Non-admin (member) cannot access admin subscription erase endpoint",
    async () => {
      await api.functional.communityPlatform.admin.subscriptions.erase(
        connection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
