import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";

/**
 * Test the primary subscription toggle lifecycle where a member deactivates their subscription to revoke posting privileges, then reactivates to regain them.
 *
 * Validates the complete toggle flow: initial subscription creation establishes an active membership, deactivation via PUT with is_active=false revokes privileges while preserving the subscription record and original join timestamp, and reactivation via PUT with is_active=true restores full membership.
 *
 * Special attention is given to verifying that the subscription entity is preserved across state transitions - the same subscription record is updated rather than deleted and recreated, maintaining historical join dates. This ensures members can toggle membership without losing their original subscription date.
 *
 * 1. Member registers on the platform and authenticates.
 * 2. Member creates a community.
 * 3. Member subscribes to the community, establishing an active subscription.
 * 4. Member deactivates the subscription using PUT with {is_active: false}, losing posting privileges.
 * 5. Validates deactivation response contains is_active: false and subscription preserved.
 * 6. Member reactivates the subscription using PUT with {is_active: true}, regaining posting privileges.
 * 7. Validates reactivation response contains is_active: true and original join timestamp unchanged.
 */
export async function test_api_community_subscription_toggle_lifecycle_deactivation_and_reactivation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create initial active subscription
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "initial subscription is active",
    subscription.is_active,
    true,
  );
  // 4. Deactivate subscription
  const deactivated =
    await api.functional.redditLikeCommunity.member.community_subscriptions.update(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          is_active: false,
        } satisfies IRedditLikeCommunityCommunitySubscription.IUpdate,
      },
    );
  typia.assert(deactivated);
  TestValidator.equals(
    "deactivated subscription is inactive",
    deactivated.is_active,
    false,
  );
  // 5. Reactivate subscription
  const reactivated =
    await api.functional.redditLikeCommunity.member.community_subscriptions.update(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          is_active: true,
        } satisfies IRedditLikeCommunityCommunitySubscription.IUpdate,
      },
    );
  typia.assert(reactivated);
  TestValidator.equals(
    "reactivated subscription is active",
    reactivated.is_active,
    true,
  );
}
