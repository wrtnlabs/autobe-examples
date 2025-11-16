import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test updating an existing community subscription by its owner user.
 *
 * This test walks through user registration, community creation, subscription
 * creation, unsubscribing (soft-delete), and then restoring (resubscribing) via
 * update. It verifies correct owner-only permissions, accurately updates
 * soft-delete (deleted_at null to restore), and refreshes audit fields
 * (updated_at). It also verifies access is not granted to another user on the
 * same resource.
 */
export async function test_api_community_subscription_update_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 2. Create a new community as the user
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10) as string &
          tags.MinLength<3> &
          tags.MaxLength<30>,
        display_title: RandomGenerator.paragraph({ sentences: 2 }) as string &
          tags.MinLength<1> &
          tags.MaxLength<100>,
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 8,
          wordMin: 4,
          wordMax: 10,
        }) as string & tags.MinLength<1> & tags.MaxLength<2000>,
        visibility: RandomGenerator.pick([
          "public",
          "private",
          "invite-only",
        ] as const),
        status: "active",
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Subscribe user to the community
  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.user.communitySubscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "community references match",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals("user references match", subscription.user.id, user.id);
  TestValidator.equals(
    "not soft-deleted initially",
    subscription.deleted_at,
    null,
  );

  // 4. Unsubscribe (soft delete) by updating the subscription's deleted_at
  const unsubscribeTime = new Date().toISOString();
  const unsubscribed: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.user.communitySubscriptions.update(
      connection,
      {
        communitySubscriptionId: subscription.id,
        body: {
          deleted_at: unsubscribeTime,
          updated_at: unsubscribeTime,
        } satisfies ICommunityPlatformCommunitySubscription.IUpdate,
      },
    );
  typia.assert(unsubscribed);
  TestValidator.equals(
    "deleted_at is set after soft-delete",
    unsubscribed.deleted_at,
    unsubscribeTime,
  );

  // 5. Resubscribe (restore) the subscription by clearing deleted_at and updating updated_at
  const restoreTime = new Date().toISOString();
  const restored: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.user.communitySubscriptions.update(
      connection,
      {
        communitySubscriptionId: subscription.id,
        body: {
          deleted_at: null,
          updated_at: restoreTime,
        } satisfies ICommunityPlatformCommunitySubscription.IUpdate,
      },
    );
  typia.assert(restored);
  TestValidator.equals(
    "deleted_at is null after restore",
    restored.deleted_at,
    null,
  );
  TestValidator.equals(
    "updated_at field updated to restore time",
    restored.updated_at,
    restoreTime,
  );

  // 6. Register a second user (non-owner)
  const attackerEmail = typia.random<string & tags.Format<"email">>();
  const attackerPassword = RandomGenerator.alphaNumeric(12);
  const attacker: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: attackerEmail,
        password: attackerPassword,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(attacker);

  // Log in as attacker
  await api.functional.auth.user.join(connection, {
    body: {
      email: attackerEmail,
      password: attackerPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });

  // 7. Attempt forbidden update by non-owner
  await TestValidator.error(
    "non-owner cannot update another user's subscription",
    async () => {
      await api.functional.communityPlatform.user.communitySubscriptions.update(
        connection,
        {
          communitySubscriptionId: subscription.id,
          body: {
            updated_at: new Date().toISOString(),
          } satisfies ICommunityPlatformCommunitySubscription.IUpdate,
        },
      );
    },
  );
}
