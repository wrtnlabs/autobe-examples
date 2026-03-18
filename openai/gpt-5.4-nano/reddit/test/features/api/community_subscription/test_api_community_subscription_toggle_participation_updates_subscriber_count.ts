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

export async function test_api_community_subscription_toggle_participation_updates_subscriber_count(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // authorize_member_join updates headers on memberConnection, but we keep
  // actor-specific connections for subsequent calls.
  typia.assert(memberAuth);
  // 2) Create a community owned by the member
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon/${RandomGenerator.alphaNumeric(8)}.png`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Create a subscription for the member to the community
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
  // 4) Baseline reads
  const baselineSubscription =
    await api.functional.communityPlatform.communitySubscriptions.at(
      memberConnection,
      { communitySubscriptionId: subscription.id },
    );
  typia.assert(baselineSubscription);
  const baselineCommunity =
    await api.functional.communityPlatform.communities.at(memberConnection, {
      communityId: community.id,
    });
  typia.assert(baselineCommunity);
  const baselineSubscriberCount: number | null =
    baselineCommunity.subscriberCount;
  const baselineUpdatedAt: string = baselineSubscription.updated_at;
  // Ensure starting state is active for the requested true->false transition.
  if (baselineSubscription.is_active !== true) {
    const ensuredActive =
      await api.functional.communityPlatform.communitySubscriptions.update(
        memberConnection,
        {
          communitySubscriptionId: baselineSubscription.id,
          body: {
            is_active: true,
          } satisfies ICommunityPlatformCommunitySubscription.IUpdate,
        },
      );
    typia.assert(ensuredActive);
  }
  const beforeToggleCommunity =
    await api.functional.communityPlatform.communities.at(memberConnection, {
      communityId: community.id,
    });
  typia.assert(beforeToggleCommunity);
  const beforeToggleSubscription =
    await api.functional.communityPlatform.communitySubscriptions.at(
      memberConnection,
      { communitySubscriptionId: baselineSubscription.id },
    );
  typia.assert(beforeToggleSubscription);
  const countBefore = beforeToggleCommunity.subscriberCount;
  TestValidator.predicate(
    "subscription should be active before toggling off",
    beforeToggleSubscription.is_active === true,
  );
  // 5) Toggle is_active: true -> false
  const toggledOff =
    await api.functional.communityPlatform.communitySubscriptions.update(
      memberConnection,
      {
        communitySubscriptionId: baselineSubscription.id,
        body: {
          is_active: false,
        } satisfies ICommunityPlatformCommunitySubscription.IUpdate,
      },
    );
  typia.assert(toggledOff);
  TestValidator.equals("is_active toggled off", toggledOff.is_active, false);
  TestValidator.notEquals(
    "updated_at changed on toggle off",
    baselineUpdatedAt,
    toggledOff.updated_at,
  );
  const communityAfterOff =
    await api.functional.communityPlatform.communities.at(memberConnection, {
      communityId: community.id,
    });
  typia.assert(communityAfterOff);
  if (countBefore !== null && communityAfterOff.subscriberCount !== null) {
    TestValidator.equals(
      "subscriberCount decreased by exactly 1",
      communityAfterOff.subscriberCount,
      countBefore - 1,
    );
  }
  // 6) Toggle is_active: false -> true
  const toggledOn =
    await api.functional.communityPlatform.communitySubscriptions.update(
      memberConnection,
      {
        communitySubscriptionId: baselineSubscription.id,
        body: {
          is_active: true,
        } satisfies ICommunityPlatformCommunitySubscription.IUpdate,
      },
    );
  typia.assert(toggledOn);
  TestValidator.equals("is_active toggled on", toggledOn.is_active, true);
  TestValidator.notEquals(
    "updated_at changed on toggle on",
    toggledOff.updated_at,
    toggledOn.updated_at,
  );
  const communityAfterOn =
    await api.functional.communityPlatform.communities.at(memberConnection, {
      communityId: community.id,
    });
  typia.assert(communityAfterOn);
  if (
    communityAfterOff.subscriberCount !== null &&
    communityAfterOn.subscriberCount !== null
  ) {
    TestValidator.equals(
      "subscriberCount increased by exactly 1",
      communityAfterOn.subscriberCount,
      communityAfterOff.subscriberCount + 1,
    );
  }
}
