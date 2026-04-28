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
 * Test that attempting to delete an already soft-deleted subscription is rejected with 404 Not Found.
 *
 * Validates the double-unsubscription prevention logic that checks `deleted_at IS NULL` before allowing a subscription deletion. When a subscription is successfully deleted, the `deleted_at` timestamp is set to mark it as soft-deleted. Any subsequent deletion attempts targeting the same subscription ID should be gracefully rejected because the subscription no longer exists in an active state.
 *
 * This test ensures idempotent failure behavior: after a subscription is removed, repeated deletion attempts do not cause errors or side effects such as double-decrementing the community subscriber count. The system recognizes the subscription is already soft-deleted and returns a 404 Not Found response.
 *
 * 1. Member authenticates via join to obtain an active session.
 * 2. Member creates a new community to subscribe to.
 * 3. Member subscribes to the community, obtaining a subscription UUID.
 * 4. Member successfully deletes the subscription (first deletion) expecting 204 No Content.
 * 5. Member attempts to delete the same subscription UUID again; response must be 404 Not Found.
 */
export async function test_api_community_subscription_unsubscribe_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via isolated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a community to subscribe to
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe to the community, obtaining subscriptionId
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. First deletion - should succeed with 204 No Content
  await api.functional.redditLikeCommunity.member.community_subscriptions.erase(
    memberConnection,
    { subscriptionId: subscription.id },
  );
  // 5. Second deletion - should fail with 404 Not Found (already soft-deleted)
  await TestValidator.httpError(
    "deleting already soft-deleted subscription returns 404",
    404,
    async () =>
      api.functional.redditLikeCommunity.member.community_subscriptions.erase(
        memberConnection,
        { subscriptionId: subscription.id },
      ),
  );
}
