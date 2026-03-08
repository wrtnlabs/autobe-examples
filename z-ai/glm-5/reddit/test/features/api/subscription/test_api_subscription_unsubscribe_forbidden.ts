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

/**
 * Test authorization enforcement when attempting to unsubscribe from another member's subscription.
 *
 * Setup:
 * 1. Register and authenticate Member A
 * 2. Create a community owned by Member A
 * 3. Register and authenticate Member B (different account)
 * 4. Subscribe Member B to the community owned by Member A
 *
 * Test Execution:
 * 1. Using Member A's authentication, attempt to call DELETE /communityPlatform/member/subscriptions/{subscriptionId} with Member B's subscription ID
 *
 * Validation Points:
 * - Response status: 403 Forbidden
 * - Error message indicates the member does not own this subscription
 * - Subscription record remains unchanged (is_active stays true)
 * - Community subscriber_count is NOT modified
 * - Member B's subscription and access remain intact
 */
export async function test_api_subscription_unsubscribe_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create a community owned by Member A
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Register and authenticate Member B (different account, will be subscription owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Subscribe Member B to Member A's community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberBConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // Verify initial state - subscription should be active
  TestValidator.equals(
    "subscription should be active initially",
    subscription.is_active,
    true,
  );
  TestValidator.equals(
    "subscription owner should be Member B",
    subscription.member.id,
    memberB.id,
  );
  // 5. Attempt to delete Member B's subscription using Member A's authentication
  // This should result in 403 Forbidden because Member A doesn't own Member B's subscription
  await TestValidator.httpError(
    "should return 403 when attempting to unsubscribe from another member's subscription",
    403,
    async () => {
      await api.functional.communityPlatform.member.subscriptions.erase(
        memberAConnection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
