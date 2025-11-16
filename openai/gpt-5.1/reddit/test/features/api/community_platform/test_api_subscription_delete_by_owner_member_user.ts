import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_subscription_delete_by_owner_member_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user so that we have
  //    an authorized memberUser context and token attached to the connection.
  const joinBody = typia.random<ICommunityPlatformMemberuser.IJoin>();

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // 2. Create a new community as this member user.
  const communityCreateBody =
    typia.random<ICommunityPlatformCommunity.ICreate>();

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a subscription for this community for the authenticated member user.
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

  // Sanity check: the subscription should be linked to the same community id.
  TestValidator.equals(
    "subscription community id should match created community id",
    subscription.community.id,
    community.id,
  );

  // 4. Delete the subscription as the owning member user.
  await api.functional.communityPlatform.memberUser.subscriptions.erase(
    connection,
    {
      subscriptionId: subscription.id,
    },
  );

  // There is no follow-up GET-by-id endpoint in the provided SDK to confirm
  // deletion, but successful completion without error implies that the
  // owning member user was authorized to delete their own subscription and
  // the backend accepted the request.
}
