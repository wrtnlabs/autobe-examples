import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * Verify owner-only update of a community subscription
 * (unsubscribe/reactivate).
 *
 * This test covers both success and failure paths for updating a community
 * subscription via PUT
 * /communityPlatform/member/subscriptions/{subscriptionId}:
 *
 * 1. Member A creates an account and logs in.
 * 2. Member A creates a community.
 * 3. Member A subscribes to their own community.
 * 4. Member A unsubscribes by setting deleted_at (soft delete).
 * 5. Member A reactivates the subscription by setting deleted_at=null.
 * 6. Member B creates another account and logs in.
 * 7. Member B attempts to update Member A's subscription (should fail).
 * 8. Attempt to update a non-existent subscription (should fail). Assertions:
 *
 * - The update returns the updated subscription object and reflects changes to
 *   deleted_at.
 * - Non-owners cannot update another user's subscription (error thrown).
 * - Updating a non-existent subscription fails (error thrown).
 */
export async function test_api_community_subscription_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Member A joins and logs in
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: memberAEmail,
      password: "Password123!",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberA);

  // 2. Member A creates a community
  const communityName = RandomGenerator.alphabets(8);
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          slug: communitySlug,
          description: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Member A subscribes to their community
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

  // 4. Member A unsubscribes by setting deleted_at
  const unsubscribeTime = new Date().toISOString();
  const unsubscribed =
    await api.functional.communityPlatform.member.subscriptions.update(
      connection,
      {
        subscriptionId: subscription.id,
        body: {
          deleted_at: unsubscribeTime,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(unsubscribed);
  TestValidator.equals(
    "subscription deleted_at set (unsubscribed)",
    unsubscribed.deleted_at,
    unsubscribeTime,
  );

  // 5. Member A reactivates the subscription by setting deleted_at to null
  const reactivated =
    await api.functional.communityPlatform.member.subscriptions.update(
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
    "subscription deleted_at cleared (reactivated)",
    reactivated.deleted_at,
    null,
  );

  // 6. Member B joins and logs in
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: memberBEmail,
      password: "Password456!",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberB);

  // 7. Member B attempts to update Member A's subscription (should fail)
  await TestValidator.error(
    "non-owner cannot update another user's subscription (should error)",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.update(
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

  // 8. Attempt to update a non-existent subscription (should fail)
  await TestValidator.error(
    "updating non-existent subscription should error",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.update(
        connection,
        {
          subscriptionId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            deleted_at: new Date().toISOString(),
          } satisfies ICommunityPlatformSubscription.IUpdate,
        },
      );
    },
  );
}
