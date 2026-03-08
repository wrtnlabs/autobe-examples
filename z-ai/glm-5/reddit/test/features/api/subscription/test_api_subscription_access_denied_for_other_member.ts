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
 * Test that a member cannot retrieve another member's subscription (authorization enforcement).
 *
 * Scenario: An authenticated member attempts to view a subscription that belongs
 * to a different member, which should be denied with 403 Forbidden.
 *
 * Steps:
 * 1. Authenticate as Member A via join endpoint
 * 2. Member A creates a community
 * 3. Member A subscribes to their community, obtaining subscription ID
 * 4. Authenticate as Member B via join endpoint (different member)
 * 5. Member B attempts to retrieve Member A's subscription using the subscription ID from step 3
 *
 * Validation points:
 * - Response returns 403 Forbidden status
 * - Authorization check correctly validates subscription ownership
 * - Member B's authentication is valid but they lack permission to access Member A's subscription
 */
export async function test_api_subscription_access_denied_for_other_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as Member A (subscription owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Step 2: Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Member A subscribes to their community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberAConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // Step 4: Authenticate as Member B (different member)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Step 5: Member B attempts to retrieve Member A's subscription - expect 403 Forbidden
  await TestValidator.httpError(
    "Member B cannot access Member A's subscription",
    403,
    async () =>
      await api.functional.communityPlatform.member.subscriptions.at(
        memberBConnection,
        { subscriptionId: subscription.id },
      ),
  );
}
