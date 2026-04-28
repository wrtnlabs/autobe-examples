import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPostSnapshot";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import type { IRedditLikeCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostSnapshot";
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
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Tests pagination and sorting of post snapshots for a specific post.
 *
 * Validates the complete snapshot query workflow including member authentication, community and post setup, and snapshot retrieval with various pagination (page, limit) and sorting parameters. Ensures that pagination metadata is accurate and that the snapshot data array respects the requested limit.
 *
 * Special attention is given to verifying boundary conditions for pagination (e.g., requesting a page beyond available data returns empty results) and that sort order is respected by the API response.
 *
 * 1. Member registers and authenticates on the platform.
 * 2. Member creates a community and subscribes to it.
 * 3. Member creates a post in the subscribed community.
 * 4. Validates default snapshot query and pagination structure.
 * 5. Validates explicit pagination with custom limit.
 * 6. Validates boundary conditions for invalid pages (empty data expected).
 * 7. Validates sorting with ascending and descending order.
 */
export async function test_api_post_snapshot_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Community creation
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Community subscription
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  // 4. Post creation
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    { body: { community_id: community.id, post_type: "text" } },
  );
  typia.assert(post);
  // 5. Default snapshot query (no pagination params)
  const defaultBody = {
    sort: undefined,
    page: undefined,
    limit: undefined,
  } satisfies IRedditLikeCommunityPostSnapshot.IRequest;
  const defaultResult =
    await api.functional.redditLikeCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: defaultBody,
      },
    );
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default query returns valid pagination info",
    defaultResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default query has non-negative record count",
    defaultResult.pagination.records >= 0,
  );
  // 6. Explicit pagination: page=1, limit=5
  const page6 = 1 satisfies number as number;
  const limit6 = 5 satisfies number as number;
  const paginatedBody = {
    sort: undefined,
    page: page6,
    limit: limit6,
  } satisfies IRedditLikeCommunityPostSnapshot.IRequest;
  const paginatedResult =
    await api.functional.redditLikeCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: paginatedBody,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "explicit page is returned",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "explicit limit is returned",
    paginatedResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedResult.data.length <= paginatedResult.pagination.limit,
  );
  // 7. Boundary test: invalid page number (page=999999)
  const page7 = 999999 satisfies number as number;
  const limit7 = 10 satisfies number as number;
  const boundaryPageBody = {
    sort: undefined,
    page: page7,
    limit: limit7,
  } satisfies IRedditLikeCommunityPostSnapshot.IRequest;
  const boundaryResult =
    await api.functional.redditLikeCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: boundaryPageBody,
      },
    );
  typia.assert(boundaryResult);
  TestValidator.equals(
    "boundary page returns empty data set",
    boundaryResult.data.length,
    0,
  );
  // 8. Sorting: ascending by created_at
  const page8 = 1 satisfies number as number;
  const limit8 = 20 satisfies number as number;
  const ascendingBody = {
    sort: "+created_at",
    page: page8,
    limit: limit8,
  } satisfies IRedditLikeCommunityPostSnapshot.IRequest;
  const ascendingResult =
    await api.functional.redditLikeCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: ascendingBody,
      },
    );
  typia.assert(ascendingResult);
  if (ascendingResult.data.length > 1) {
    TestValidator.predicate(
      "ascending sort: first snapshot created_at <= second snapshot created_at",
      new Date(ascendingResult.data[0].createdAt).getTime() <=
        new Date(ascendingResult.data[1].createdAt).getTime(),
    );
  }
  // 9. Sorting: descending by created_at
  const page9 = 1 satisfies number as number;
  const limit9 = 20 satisfies number as number;
  const descendingBody = {
    sort: "-created_at",
    page: page9,
    limit: limit9,
  } satisfies IRedditLikeCommunityPostSnapshot.IRequest;
  const descendingResult =
    await api.functional.redditLikeCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: descendingBody,
      },
    );
  typia.assert(descendingResult);
  if (descendingResult.data.length > 1) {
    TestValidator.predicate(
      "descending sort: first snapshot created_at >= second snapshot created_at",
      new Date(descendingResult.data[0].createdAt).getTime() >=
        new Date(descendingResult.data[1].createdAt).getTime(),
    );
  }
}
