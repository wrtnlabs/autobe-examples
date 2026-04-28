import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPost";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
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
 * Test the post search endpoint's sorting and pagination capabilities.
 *
 * Creates a member, community, and multiple posts, then validates that search results can be sorted by recency ('new'), vote score ('top'), and engagement ('hot'), and that pagination controls work correctly with proper metadata reporting.
 *
 * 1. Member registers an account.
 * 2. Member creates a community and subscribes to it.
 * 3. Five posts are created with slight delays between each to ensure distinct timestamps.
 * 4. Search with sort_by='new' and pagination (page=1, limit=2) returns the two most recent posts.
 * 5. Validates pagination metadata shows correct current page, limit, total records, and page count.
 * 6. Search with sort_by='top' returns posts ordered by vote score descending.
 * 7. Search with sort_by='hot' returns posts ordered by engagement metrics descending.
 */
export async function test_api_post_search_with_sorting_and_pagination(
  connection: api.IConnection,
) {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe to community (required for posting)
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create multiple posts with slight delays for distinct timestamps
  const posts: IREdditLikeCommunityPost[] = [];
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    const post =
      await generate_random_reddit_like_community_member_posts_create(
        memberConnection,
        {
          body: {
            community_id: community.id,
            post_type: "text",
            title: `Test post ${i + 1}`,
            body: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(post);
    posts.push(post);
  }
  // 5. Test search with sort_by='new' and pagination
  const newRequest = {
    community_id: community.id,
    sort_by: "new",
    page: 1,
    limit: 2,
  } satisfies IREdditLikeCommunityPost.IRequest;
  const newResult = await api.functional.redditLikeCommunity.posts.index(
    memberConnection,
    { body: newRequest },
  );
  typia.assert(newResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    newResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", newResult.pagination.limit, 2);
  TestValidator.equals("pagination records", newResult.pagination.records, 5);
  TestValidator.predicate(
    "pagination pages is positive",
    newResult.pagination.pages > 0,
  );
  // Validate data length matches limit
  TestValidator.equals("data length equals limit", newResult.data.length, 2);
  // Validate sorting by new - most recent posts first
  TestValidator.predicate(
    "new sorting - most recent post first",
    newResult.data[0].created_at >= newResult.data[1].created_at,
  );
  // 6. Test search with sort_by='top'
  const topRequest = {
    community_id: community.id,
    sort_by: "top",
    page: 1,
    limit: 5,
  } satisfies IREdditLikeCommunityPost.IRequest;
  const topResult = await api.functional.redditLikeCommunity.posts.index(
    memberConnection,
    { body: topRequest },
  );
  typia.assert(topResult);
  TestValidator.equals(
    "top pagination current",
    topResult.pagination.current,
    1,
  );
  TestValidator.equals("top pagination limit", topResult.pagination.limit, 5);
  TestValidator.equals(
    "top pagination records",
    topResult.pagination.records,
    5,
  );
  TestValidator.equals("top data length", topResult.data.length, 5);
  // Validate top sorting - vote scores in descending order
  for (let i = 0; i < topResult.data.length - 1; i++) {
    TestValidator.predicate(
      `top sorting - item ${i} has higher or equal vote score than item ${i + 1}`,
      topResult.data[i].vote_score >= topResult.data[i + 1].vote_score,
    );
  }
  // 7. Test search with sort_by='hot'
  const hotRequest = {
    community_id: community.id,
    sort_by: "hot",
    page: 1,
    limit: 5,
  } satisfies IREdditLikeCommunityPost.IRequest;
  const hotResult = await api.functional.redditLikeCommunity.posts.index(
    memberConnection,
    { body: hotRequest },
  );
  typia.assert(hotResult);
  TestValidator.equals(
    "hot pagination current",
    hotResult.pagination.current,
    1,
  );
  TestValidator.equals("hot pagination limit", hotResult.pagination.limit, 5);
  TestValidator.equals(
    "hot pagination records",
    hotResult.pagination.records,
    5,
  );
  TestValidator.equals("hot data length", hotResult.data.length, 5);
  // Validate hot sorting - engagement (vote_score + comment_count) in descending order
  for (let i = 0; i < hotResult.data.length - 1; i++) {
    const currentEngagement =
      hotResult.data[i].vote_score + hotResult.data[i].comment_count;
    const nextEngagement =
      hotResult.data[i + 1].vote_score + hotResult.data[i + 1].comment_count;
    TestValidator.predicate(
      `hot sorting - item ${i} has higher or equal engagement than item ${i + 1}`,
      currentEngagement >= nextEngagement,
    );
  }
  // 8. Test second page of pagination
  const pageTwoRequest = {
    community_id: community.id,
    sort_by: "new",
    page: 2,
    limit: 2,
  } satisfies IREdditLikeCommunityPost.IRequest;
  const pageTwoResult = await api.functional.redditLikeCommunity.posts.index(
    memberConnection,
    { body: pageTwoRequest },
  );
  typia.assert(pageTwoResult);
  TestValidator.equals(
    "page 2 pagination current",
    pageTwoResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit",
    pageTwoResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "page 2 pagination records",
    pageTwoResult.pagination.records,
    5,
  );
  TestValidator.equals("page 2 data length", pageTwoResult.data.length, 1);
  // Validate that page 2 contains older posts than page 1
  TestValidator.predicate(
    "page 2 posts are older than page 1 posts",
    pageTwoResult.data[0].created_at <=
      newResult.data[newResult.data.length - 1].created_at,
  );
}
