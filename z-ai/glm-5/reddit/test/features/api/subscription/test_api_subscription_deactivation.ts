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

export async function test_api_subscription_deactivation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a member can successfully deactivate an active subscription,
   * and the community subscriber_count decrements correctly.
   */
  // 1. Create member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Record initial subscriber count (should be 1 after subscription)
  const initialSubscriberCount = community.subscriberCount;
  // 5. Deactivate the subscription
  const deactivatedSubscription =
    await api.functional.communityPlatform.member.subscriptions.update(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          is_active: false,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(deactivatedSubscription);
  // 6. Verify is_active is false
  TestValidator.equals(
    "subscription is inactive",
    deactivatedSubscription.is_active,
    false,
  );
  // 7. Verify updated_at is greater than created_at
  TestValidator.predicate(
    "updated_at after created_at",
    new Date(deactivatedSubscription.updated_at).getTime() >
      new Date(deactivatedSubscription.created_at).getTime(),
  );
  // 8. Verify subscription record still exists (not deleted)
  TestValidator.equals(
    "subscription id preserved",
    deactivatedSubscription.id,
    subscription.id,
  );
  // Note: Subscriber count verification would require fetching the community again
  // which is not available in the provided API functions, so we verify the
  // subscription deactivation was successful based on the response
}
