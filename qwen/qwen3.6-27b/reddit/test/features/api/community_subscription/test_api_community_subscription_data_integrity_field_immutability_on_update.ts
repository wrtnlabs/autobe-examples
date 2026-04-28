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
 * Verifies data integrity of community subscription fields remain immutable during state updates.
 *
 * Validates that member-community pairing identifiers, original join timestamp, and creation timestamp are never modified when toggling subscription active status. Tests the complete membership lifecycle from initialization through state change, confirming historical data preservation and update timestamp tracking.
 *
 * Special attention to ensuring joined_at permanently records initial membership establishment, created_at preserves original subscription record creation time, member_id and community_id maintain their original reference identities regardless of is_active transitions.
 *
 * 1. Register member and authenticate session.
 * 2. Generate community for subscription target.
 * 3. Create subscription and capture baseline immutable values.
 * 4. Update subscription is_active toggle.
 * 5. Validate member_id unchanged (same member still owns the subscription).
 * 6. Validate community_id unchanged (still linked to same community).
 * 7. Validate joined_at preserved (original membership date not modified).
 * 8. Validate created_at unchanged.
 * 9. Validate updated_at reflects the modification timestamp (changed from original).
 */
export async function test_api_community_subscription_data_integrity_field_immutability_on_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<string>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create community using utility function
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assertGuard(community);
  // 3. Create subscription using utility function
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {},
    );
  typia.assertGuard(subscription);
  // 4. Extract original immutable values
  const originalMemberId = subscription.member.id;
  const originalCommunityId = subscription.community.id;
  const originalJoinedAt = subscription.joined_at;
  const originalCreatedAt = subscription.created_at;
  // 5. Update subscription is_active toggle
  const updatedSubscription =
    await api.functional.redditLikeCommunity.member.community_subscriptions.update(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          is_active: !subscription.is_active,
        } satisfies IRedditLikeCommunityCommunitySubscription.IUpdate,
      },
    );
  typia.assert(updatedSubscription);
  // 6. Validate immutability fields are preserved
  TestValidator.equals(
    "member_id unchanged",
    updatedSubscription.member.id,
    originalMemberId,
  );
  TestValidator.equals(
    "community_id unchanged",
    updatedSubscription.community.id,
    originalCommunityId,
  );
  TestValidator.equals(
    "joined_at unchanged",
    updatedSubscription.joined_at,
    originalJoinedAt,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedSubscription.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedSubscription.updated_at,
    subscription.updated_at,
  );
}
