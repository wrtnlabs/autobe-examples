import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Test that unsubscribed communities are excluded from the subscription list.
 *
 * Setup:
 * 1. Authenticate as a member using authorize_member_join
 * 2. Create a community using generate_random_reddit_like_member_communities_create
 * 3. Subscribe to the community using /redditLike/member/communities/{communityId}/subscriptions (post)
 * 4. Verify the subscription appears in the list by calling PATCH /redditLike/member/subscriptions
 * 5. Unsubscribe from the community using DELETE /redditLike/member/communities/{communityId}/subscriptions
 *
 * Test Execution:
 * Call PATCH /redditLike/member/subscriptions again after unsubscription.
 *
 * Validation Points:
 * - After unsubscription, the community no longer appears in the subscribed communities list
 * - Response data array excludes the unsubscribed community
 * - Pagination records count reflects the removal (decreases accordingly)
 * - This validates that only active subscriptions (deleted_at IS NULL) are returned
 */
export async function test_api_community_subscription_list_after_unsubscribe(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Verify the subscription appears in the list
  const beforeUnsubscribe: IPageIRedditLikeCommunity.ISummary =
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {} satisfies IRedditLikeCommunitySubscription.IRequest,
      },
    );
  typia.assert(beforeUnsubscribe);
  TestValidator.equals(
    "subscription count before unsubscribe",
    beforeUnsubscribe.pagination.records,
    1,
  );
  TestValidator.equals(
    "data length before unsubscribe",
    beforeUnsubscribe.data.length,
    1,
  );
  TestValidator.equals(
    "subscribed community id",
    beforeUnsubscribe.data[0].id,
    community.id,
  );
  // 5. Unsubscribe from the community
  await api.functional.redditLike.member.communities.subscriptions.erase(
    memberConnection,
    { communityId: community.id },
  );
  // 6. Call subscription list again after unsubscription
  const afterUnsubscribe: IPageIRedditLikeCommunity.ISummary =
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {} satisfies IRedditLikeCommunitySubscription.IRequest,
      },
    );
  typia.assert(afterUnsubscribe);
  // 7. Validate the unsubscribed community is excluded
  TestValidator.equals(
    "subscription count after unsubscribe",
    afterUnsubscribe.pagination.records,
    0,
  );
  TestValidator.equals(
    "data length after unsubscribe",
    afterUnsubscribe.data.length,
    0,
  );
  // Verify the community is not in the list
  const hasCommunity = afterUnsubscribe.data.some(
    (item) => item.id === community.id,
  );
  TestValidator.predicate(
    "unsubscribed community should not be in list",
    !hasCommunity,
  );
}
