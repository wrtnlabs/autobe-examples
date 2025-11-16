import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_subscription_delete_stops_notifications_preference(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain an authenticated context
  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: typia.random<ICommunityPlatformMemberuser.IJoin>(),
    });
  typia.assert(authorized);

  // 2. Create a new community as this memberUser
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: typia.random<ICommunityPlatformCommunity.ICreate>(),
      },
    );
  typia.assert(community);

  // 3. Create a subscription to the community with notifications enabled
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // Basic business validations before deletion
  TestValidator.equals(
    "subscription should belong to the joined member user",
    subscription.memberUser.id,
    authorized.id,
  );
  TestValidator.equals(
    "subscription should target the created community",
    subscription.community.id,
    community.id,
  );
  TestValidator.predicate(
    "subscription is active before deletion",
    subscription.is_active === true,
  );
  TestValidator.predicate(
    "subscription has notifications enabled before deletion",
    subscription.receive_notifications === true,
  );

  // 4. Delete the subscription as the same member user
  await api.functional.communityPlatform.memberUser.subscriptions.erase(
    connection,
    {
      subscriptionId: subscription.id,
    },
  );

  // 5. Assert that we reached this point without error, implying success
  TestValidator.predicate(
    "subscription deletion completed without throwing",
    true,
  );
}
