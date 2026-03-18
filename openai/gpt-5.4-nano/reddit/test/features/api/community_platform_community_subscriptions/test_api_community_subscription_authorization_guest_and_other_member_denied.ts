import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_subscription_authorization_guest_and_other_member_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2) Create a community owned by memberA
  const community = await generate_random_community_platform_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3) Member A subscribes to obtain communitySubscriptionId_A
  const subscriptionA =
    await generate_random_community_platform_community_subscriptions_create(
      memberAConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionA);
  // 4) Guest tries to update subscriptionA
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "guest cannot update community subscription",
    403,
    async () =>
      await api.functional.communityPlatform.communitySubscriptions.update(
        guestConnection,
        {
          communitySubscriptionId: subscriptionA.id,
          body: {
            is_active: !subscriptionA.is_active,
          } satisfies ICommunityPlatformCommunitySubscription.IUpdate,
        },
      ),
  );
  // 5) Member B joins and subscribes to the same community
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  const subscriptionB =
    await generate_random_community_platform_community_subscriptions_create(
      memberBConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionB);
  // 6) Member B tries to update memberA's subscription
  await TestValidator.httpError(
    "memberB cannot update memberA community subscription",
    403,
    async () =>
      await api.functional.communityPlatform.communitySubscriptions.update(
        memberBConnection,
        {
          communitySubscriptionId: subscriptionA.id,
          body: {
            is_active: !subscriptionA.is_active,
          } satisfies ICommunityPlatformCommunitySubscription.IUpdate,
        },
      ),
  );
}
