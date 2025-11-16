import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate deleting an already inactive community subscription.
 *
 * Business context: A member user can subscribe to communities. Subscriptions
 * may be marked inactive (is_active === false) while the row is still present
 * for historical or idempotency reasons. Even if a subscription is inactive,
 * the user should still be able to fully delete it, removing the subscription
 * record and preventing subsequent operations on it.
 *
 * Scenario covered by this test:
 *
 * 1. Register a fresh memberUser (join) to obtain an authenticated context.
 * 2. As this memberUser, create a community.
 * 3. Create a community subscription to that community starting in an inactive
 *    state (is_active: false).
 * 4. Verify that the created subscription is indeed inactive and associated with
 *    the correct memberUser and community.
 * 5. Call the DELETE subscription endpoint for this inactive subscription as the
 *    same memberUser and ensure it succeeds (no error thrown).
 * 6. Attempt to delete the same subscription a second time and assert that this
 *    fails, confirming that the original deletion removed the subscription.
 */
export async function test_api_subscription_delete_inactive_subscription(
  connection: api.IConnection,
) {
  // 1. Register new member user (join) to get authenticated memberUser context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // Let server derive IP if omitted or null; here we explicitly send null
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a community owned by this memberUser
  const communityBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 3,
      wordMax: 10,
    }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create an inactive subscription to the created community
  const receiveNotificationsOptions = [true, false] as const;
  const subscriptionBody = {
    community_platform_community_id: community.id,
    is_active: false,
    receive_notifications: RandomGenerator.pick(receiveNotificationsOptions),
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionBody,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription);

  // 4. Verify subscription is inactive and associated with correct entities
  TestValidator.equals(
    "subscription is created as inactive",
    subscription.is_active,
    false,
  );
  TestValidator.equals(
    "subscription community id matches created community",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscription memberUser id matches joined memberUser",
    subscription.memberUser.id,
    authorized.id,
  );

  // 5. Delete the inactive subscription (should succeed without error)
  await api.functional.communityPlatform.memberUser.subscriptions.erase(
    connection,
    {
      subscriptionId: subscription.id,
    },
  );

  // 6. Second delete attempt should fail, indicating the subscription
  //    was removed by the first delete. We do not assert specific
  //    HTTP status codes, only that an error occurs.
  await TestValidator.error(
    "second delete on same subscription should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.subscriptions.erase(
        connection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
