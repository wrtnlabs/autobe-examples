import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate hard deletion of a community subscription by an administrator.
 *
 * 1. Register a user (subscriber)
 * 2. User creates a new community
 * 3. User subscribes to the created community
 * 4. Register an administrator
 * 5. Switch to admin via administrator login
 * 6. Admin hard-deletes the user's subscription using its id (erase API)
 * 7. Attempt to access the deleted subscription or resubscribe to show permanent
 *    removal (should fail)
 */
export async function test_api_community_subscription_hard_delete_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register a regular user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = typia.random<string & tags.Format<"password">>();
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);

  // 2. User creates a new community
  const communityCreate = {
    name: RandomGenerator.alphaNumeric(10),
    display_title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    visibility: RandomGenerator.pick([
      "public",
      "private",
      "invite-only",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "archived",
      "banned",
      "pending approval",
    ] as const),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // 3. User subscribes to the community
  const subscription =
    await api.functional.communityPlatform.user.communitySubscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  const communitySubscriptionId = subscription.id;

  // 4. Register an admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // 5. Switch to admin (admin login)
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin-login.com/page", // test value
      referrer: "https://referrer.com/", // test value
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 6. Admin performs hard delete
  await api.functional.communityPlatform.administrator.communitySubscriptions.erase(
    connection,
    {
      communitySubscriptionId: communitySubscriptionId,
    },
  );

  // 7. User cannot resubscribe (should succeed, since erased record is purged and new subscription is possible)
  //    - Test that old subscription is gone (re-add should succeed since hard delete purged unique constraint)
  // Switch back to subscriber
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://user-login.com/page", // test value
      referrer: "https://referrer.com/", // test value
    } satisfies ICommunityPlatformUser.ILogin,
  });
  // User recreates a subscription
  const newSubscription =
    await api.functional.communityPlatform.user.communitySubscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(newSubscription);
  // Verify that subscription id is different (hard delete really removed the old record)
  TestValidator.notEquals(
    "new subscription id should differ, meaning hard delete was effective",
    newSubscription.id,
    communitySubscriptionId,
  );
}
