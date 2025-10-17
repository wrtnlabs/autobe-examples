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
 * Test scenario for admin updating a member's community subscription
 *
 * 1. Admin registers and authenticates.
 * 2. Member registers and authenticates.
 * 3. Member creates a community.
 * 4. Member subscribes to the created community.
 * 5. Admin updates (sets deleted_at to simulate unsubscribe/ban) the subscription.
 * 6. Admin reactivates (sets deleted_at to null) the subscription.
 * 7. Unauthorized member tries to update (should fail).
 * 8. Member updates their own subscription (should succeed).
 */
export async function test_api_subscription_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register platform admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Register normal member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: As member, create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          slug: RandomGenerator.alphaNumeric(8),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: As member, subscribe to the community
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

  // Step 5: As admin, update the subscription (simulate 'unsubscribe' by setting deleted_at)
  await api.functional.auth.admin.join(connection, {
    body: { email: adminEmail, password: adminPassword },
  });
  const nowIso = new Date().toISOString();
  const unsubscribed =
    await api.functional.communityPlatform.admin.subscriptions.update(
      connection,
      {
        subscriptionId: subscription.id,
        body: {
          deleted_at: nowIso,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(unsubscribed);
  TestValidator.equals(
    "subscription deleted_at set by admin",
    unsubscribed.deleted_at,
    nowIso,
  );

  // Step 6: Admin reactivates (sets deleted_at to null)
  const reactivated =
    await api.functional.communityPlatform.admin.subscriptions.update(
      connection,
      {
        subscriptionId: subscription.id,
        body: {
          deleted_at: null,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(reactivated);
  TestValidator.equals(
    "subscription reactivated by admin",
    reactivated.deleted_at,
    null,
  );

  // Step 7: Unauthorized member tries to update (should fail)
  const unauthorizedEmail = typia.random<string & tags.Format<"email">>();
  const unauthorizedPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.member.join(connection, {
    body: { email: unauthorizedEmail, password: unauthorizedPassword },
  });
  await TestValidator.error(
    "unauthorized user cannot update other's subscription",
    async () => {
      await api.functional.communityPlatform.admin.subscriptions.update(
        connection,
        {
          subscriptionId: subscription.id,
          body: {
            deleted_at: new Date().toISOString(),
          } satisfies ICommunityPlatformSubscription.IUpdate,
        },
      );
    },
  );

  // Step 8: Member updates their own subscription (should succeed)
  await api.functional.auth.member.join(connection, {
    body: { email: memberEmail, password: memberPassword },
  });
  const selfUpdate =
    await api.functional.communityPlatform.admin.subscriptions.update(
      connection,
      {
        subscriptionId: subscription.id,
        body: {
          deleted_at: new Date().toISOString(),
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(selfUpdate);
  TestValidator.predicate(
    "member can update own subscription (deleted_at set)",
    typeof selfUpdate.deleted_at === "string",
  );
}
