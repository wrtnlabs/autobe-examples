import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_member_subscription_get_forbidden_for_other_owner(
  connection: api.IConnection,
) {
  // 1. Register member A
  const memberAJoinInput = typia.random<ICommunityPlatformMemberuser.IJoin>();
  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinInput,
    });
  typia.assert(memberA);

  // 2. As member A, create a community
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

  // 3. As member A, create a subscription to that community
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;
  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId: memberA.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // Sanity: owner (member A) can fetch their own subscription
  const ownerFetched: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.at(
      connection,
      {
        subscriptionId: subscription.id,
      },
    );
  typia.assert(ownerFetched);
  TestValidator.equals(
    "owner should retrieve own subscription by id",
    ownerFetched.id,
    subscription.id,
  );

  // 4. Register member B on the same connection (this overwrites Authorization)
  const memberBJoinInput = typia.random<ICommunityPlatformMemberuser.IJoin>();
  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinInput,
    });
  typia.assert(memberB);

  // 5. As member B, attempt to GET member A's subscription by id and expect an authorization error
  await TestValidator.httpError(
    "other member must not access someone else's subscription",
    [401, 403, 404],
    async () => {
      await api.functional.communityPlatform.memberUser.subscriptions.at(
        connection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
