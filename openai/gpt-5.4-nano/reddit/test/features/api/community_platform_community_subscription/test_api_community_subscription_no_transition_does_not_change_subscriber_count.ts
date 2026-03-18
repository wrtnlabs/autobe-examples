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

export async function test_api_community_subscription_no_transition_does_not_change_subscriber_count(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member actor + community
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 2) Subscribe member to community (capture subscription id)
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  const communityId = community.id;
  const communitySubscriptionId = subscription.id;
  // 3) Baseline subscriber count
  const baseline = await api.functional.communityPlatform.communities.at(
    memberConnection,
    {
      communityId,
    },
  );
  typia.assert(baseline);
  // 4) Current subscription state
  const current =
    await api.functional.communityPlatform.communitySubscriptions.at(
      memberConnection,
      {
        communitySubscriptionId,
      },
    );
  typia.assert(current);
  const baselineIsActive = current.is_active;
  // 5) PUT with no effective state transition
  const updated =
    await api.functional.communityPlatform.communitySubscriptions.update(
      memberConnection,
      {
        communitySubscriptionId,
        body: {
          is_active: baselineIsActive,
        } satisfies ICommunityPlatformCommunitySubscription.IUpdate,
      },
    );
  typia.assert(updated);
  // 6) Assert is_active unchanged + subscriberCount unchanged
  TestValidator.equals(
    "subscription is_active remains unchanged",
    updated.is_active,
    baselineIsActive,
  );
  const after = await api.functional.communityPlatform.communities.at(
    memberConnection,
    {
      communityId,
    },
  );
  typia.assert(after);
  TestValidator.equals(
    "community subscriberCount unchanged when is_active does not transition",
    after.subscriberCount,
    baseline.subscriberCount,
  );
}
