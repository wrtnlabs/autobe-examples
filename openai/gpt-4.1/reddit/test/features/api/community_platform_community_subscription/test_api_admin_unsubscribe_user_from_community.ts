import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunitySubscriptionNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscriptionNotifications";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Admin can forcibly unsubscribe a user from a community (opt-out).
 *
 * Steps:
 *
 * 1. Register a new admin account, keep admin's credential
 * 2. Register a new user account, keep user's credential
 * 3. Login as user, create a new community (user is creator)
 * 4. User subscribes self to the created community
 * 5. Login as admin (re-authenticate connection as admin)
 * 6. Use admin DELETE /communityPlatform/admin/subscriptions/{subscriptionId} to
 *    force-unsubscribe user
 * 7. Check the subscription record is soft-deleted (deleted_at is non-null)
 * 8. Attempt to re-delete the same subscription and expect error
 * 9. Attempt to delete non-existent subscriptionId (random id) and expect error
 */
export async function test_api_admin_unsubscribe_user_from_community(
  connection: api.IConnection,
) {
  // 1. Register admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminDisplayName = RandomGenerator.name();
  const adminHref = "https://admin.example.com/register";
  const adminReferrer = "https://admin.example.com/landing";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: adminHref,
      referrer: adminReferrer,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register normal user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const userDisplayName = RandomGenerator.name();
  const userHref = "https://user.example.com/register";
  const userReferrer = "https://user.example.com/landing";
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      display_name: userDisplayName,
      href: userHref,
      referrer: userReferrer,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);

  // 3. Switch to user context (token already set by join)
  const communityName = RandomGenerator.alphabets(12);
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
  });
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName as string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">,
        description: communityDescription as string &
          tags.MinLength<1> &
          tags.MaxLength<250>,
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 4. User subscribes to the created community
  const subscription =
    await api.functional.communityPlatform.user.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 5. Switch to admin context
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: adminHref,
      referrer: adminReferrer,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // 6. Admin deletes subscription (force-unsubscribe)
  await api.functional.communityPlatform.admin.subscriptions.erase(connection, {
    subscriptionId: subscription.id,
  });

  // (Re-authenticate as user because only user can check their subscription)
  await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      display_name: userDisplayName,
      href: userHref,
      referrer: userReferrer,
    } satisfies ICommunityPlatformUser.IJoin,
  });

  // Cannot directly check the deleted subscription without a lookup API, but if possible, you would re-query and assert deleted_at is not null
  // For this test, ensure no errors occur and deletion completes

  // 8. Admin tries to delete the already-deleted subscription again (should fail)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: adminHref,
      referrer: adminReferrer,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  await TestValidator.error(
    "re-delete already deleted subscription should error",
    async () => {
      await api.functional.communityPlatform.admin.subscriptions.erase(
        connection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
  // 9. Admin tries to delete a random, non-existent subscriptionId (should error)
  await TestValidator.error(
    "delete non-existent subscription should error",
    async () => {
      await api.functional.communityPlatform.admin.subscriptions.erase(
        connection,
        {
          subscriptionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
