import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

/**
 * Verify community list sorting by created_at (newest/oldest) and subscriber_count.
 *
 * Registers a member, creates multiple communities sequentially, then validates that the community list endpoint correctly orders results based on the sort_by parameter. Newest and oldest sorting are verified by comparing creation order of test communities. Most subscribed sorting is validated by confirming descending subscriber_count order.
 *
 * 1. Register a member and authenticate for community creation.
 * 2. Create three communities sequentially to establish known creation timestamps.
 * 3. Query with sort_by='newest' and verify most recently created community appears first.
 * 4. Query with sort_by='oldest' and verify oldest community appears first.
 * 5. Query with sort_by='most_subscribed' and verify subscriber_count ordering is descending.
 */
export async function test_api_community_sort_by_created_at_or_subscriber_count(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Create communities sequentially (oldest → middle → newest)
  const communityOldest =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(communityOldest);
  const communityMiddle =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(communityMiddle);
  const communityNewest =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(communityNewest);
  const ourCommunityIds = new Set([
    communityOldest.id,
    communityMiddle.id,
    communityNewest.id,
  ]);
  // 3. Test sort_by='newest' (most recent first)
  const newestResponse =
    await api.functional.redditLikeCommunity.community_profiles.index(
      memberConnection,
      {
        body: {
          sort_by: "newest",
          limit: 50,
        } satisfies IREdditLikeCommunityCommunity.IRequest,
      },
    );
  typia.assert(newestResponse);
  const newestOurs = newestResponse.data.filter((c) =>
    ourCommunityIds.has(c.id),
  );
  TestValidator.equals(
    "newest sort - first item is most recently created",
    newestOurs[0]?.id,
    communityNewest.id,
  );
  TestValidator.equals(
    "newest sort - last item is oldest created",
    newestOurs[newestOurs.length - 1]?.id,
    communityOldest.id,
  );
  // 4. Test sort_by='oldest' (oldest first)
  const oldestResponse =
    await api.functional.redditLikeCommunity.community_profiles.index(
      memberConnection,
      {
        body: {
          sort_by: "oldest",
          limit: 50,
        } satisfies IREdditLikeCommunityCommunity.IRequest,
      },
    );
  typia.assert(oldestResponse);
  const oldestOurs = oldestResponse.data.filter((c) =>
    ourCommunityIds.has(c.id),
  );
  TestValidator.equals(
    "oldest sort - first item is oldest created",
    oldestOurs[0]?.id,
    communityOldest.id,
  );
  TestValidator.equals(
    "oldest sort - last item is most recently created",
    oldestOurs[oldestOurs.length - 1]?.id,
    communityNewest.id,
  );
  // 5. Test sort_by='most_subscribed' (descending by subscriber_count)
  const subscribedResponse =
    await api.functional.redditLikeCommunity.community_profiles.index(
      memberConnection,
      {
        body: {
          sort_by: "most_subscribed",
          limit: 50,
        } satisfies IREdditLikeCommunityCommunity.IRequest,
      },
    );
  typia.assert(subscribedResponse);
  const subscribedOurs = subscribedResponse.data.filter((c) =>
    ourCommunityIds.has(c.id),
  );
  TestValidator.equals(
    "most_subscribed - returns all test communities",
    subscribedOurs.length,
    3,
  );
  for (let i = 0; i < subscribedOurs.length - 1; i++) {
    TestValidator.predicate(
      `most_subscribed order: item ${i} subscriber_count >= item ${i + 1}`,
      subscribedOurs[i].subscriber_count >=
        subscribedOurs[i + 1].subscriber_count,
    );
  }
}
