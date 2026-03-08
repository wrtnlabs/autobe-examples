import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_subscription_activation(
  connection: api.IConnection,
): Promise<void> {
  // Prerequisites
  // 1. Member authentication (join)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Store initial subscriber count (should be 0 after creation)
  const initialSubscriberCount = community.subscriberCount;
  // 3. Subscribe to the community (creates active subscription)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // Verify subscription is active
  TestValidator.equals(
    "subscription initially active",
    subscription.is_active,
    true,
  );
  // Store updated_at timestamp for later comparison
  const activeUpdatedAt = subscription.updated_at;
  // 4. Deactivate the subscription (DELETE - sets is_active=false)
  await api.functional.communityPlatform.member.subscriptions.erase(
    memberConnection,
    { subscriptionId: subscription.id },
  );
  // Wait briefly to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test Step: Reactivate the subscription
  const reactivatedSubscription =
    await api.functional.communityPlatform.member.subscriptions.update(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          is_active: true,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(reactivatedSubscription);
  // Validation
  // 1. Verify is_active is true
  TestValidator.equals(
    "subscription reactivated",
    reactivatedSubscription.is_active,
    true,
  );
  // 2. Verify updated_at timestamp changed
  TestValidator.predicate(
    "updated_at timestamp increased",
    new Date(reactivatedSubscription.updated_at).getTime() >
      new Date(activeUpdatedAt).getTime(),
  );
  // 3. Verify community subscriber_count incremented by 1 from inactive state
  // After deactivate: count = initial + 1 - 1 = initial
  // After reactivate: count = initial + 1
  TestValidator.equals(
    "community subscriber count",
    reactivatedSubscription.community.subscriber_count,
    initialSubscriberCount + 1,
  );
  // 4. Verify same subscription record was reused (same id)
  TestValidator.equals(
    "same subscription id",
    reactivatedSubscription.id,
    subscription.id,
  );
}
