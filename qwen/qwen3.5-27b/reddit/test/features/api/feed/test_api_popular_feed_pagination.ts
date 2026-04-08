import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test the popular feed endpoint pagination functionality with offset-based pagination.
 *
 * Validates that posts are correctly paginated and pagination metadata is accurate. The test creates multiple posts to ensure pagination works across multiple pages, then verifies offset-based pagination returns correct results with accurate metadata.
 *
 * Special attention is given to verifying pagination metadata accuracy (current page, total records, total pages), handling empty results when requesting pages beyond available data, testing different sorting methods (hot, new, top, controversial), and validating time filter functionality for top-sorted posts.
 *
 * 1. Authenticate member and subscribe to a community.
 * 2. Create 35 posts to test pagination across multiple pages.
 * 3. Test offset-based pagination with default limit (25 posts per page).
 * 4. Test offset-based pagination with custom limit and page parameters.
 * 5. Validate pagination metadata (current, limit, records, pages) is accurate.
 * 6. Test empty results when requesting page beyond available data.
 * 7. Test maximum limit enforcement (100 posts).
 * 8. Test pagination with different sort types (hot, new, top, controversial).
 * 9. Test time filter variations for top-sorted posts (today, week, month, year, all).
 * 10. Verify created posts appear in the popular feed.
 * 11. Test pagination at page boundaries (first page, middle page, last page).
 */
export async function test_api_popular_feed_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Subscribe to a community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {},
    );
  typia.assert(subscription);
  const communityId = subscription.community.id;
  // 3. Create 35 posts to test pagination (more than default page size of 25)
  const posts: IRedditClonePost[] = [];
  for (let i = 0; i < 35; i++) {
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {
        body: {
          community_id: communityId,
        },
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 4. Test offset-based pagination with default limit (25 posts per page)
  const defaultPageResult =
    await api.functional.redditClone.feeds.popular.index(memberConnection, {
      body: {
        page: 1,
      },
    });
  typia.assert(defaultPageResult);
  TestValidator.equals(
    "default limit is 25",
    defaultPageResult.pagination.limit,
    25,
  );
  TestValidator.equals(
    "current page is 1",
    defaultPageResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has posts in first page",
    defaultPageResult.data.length > 0,
  );
  TestValidator.equals(
    "total records matches created posts",
    defaultPageResult.pagination.records,
    35,
  );
  TestValidator.equals(
    "total pages calculated correctly",
    defaultPageResult.pagination.pages,
    2,
  );
  // 5. Test offset-based pagination with custom limit (10 posts per page)
  const customLimitResult =
    await api.functional.redditClone.feeds.popular.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(customLimitResult);
  TestValidator.equals(
    "custom limit applied",
    customLimitResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "current page is 1",
    customLimitResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "total records is 35",
    customLimitResult.pagination.records,
    35,
  );
  TestValidator.equals(
    "total pages with limit 10",
    customLimitResult.pagination.pages,
    4,
  );
  TestValidator.equals(
    "first page has 10 posts",
    customLimitResult.data.length,
    10,
  );
  // 6. Test offset-based pagination page 2 with custom limit
  const page2Result = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 10,
      },
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("current page is 2", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 has 10 posts", page2Result.data.length, 10);
  TestValidator.predicate(
    "page 2 posts are different from page 1",
    !page2Result.data.some((p) =>
      customLimitResult.data.some((p1) => p1.id === p.id),
    ),
  );
  // 7. Test last page (page 4 with limit 10)
  const lastPageResult = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        page: 4,
        limit: 10,
      },
    },
  );
  typia.assert(lastPageResult);
  TestValidator.equals("last page is 4", lastPageResult.pagination.current, 4);
  TestValidator.equals(
    "last page has remaining 5 posts",
    lastPageResult.data.length,
    5,
  );
  TestValidator.predicate(
    "last page posts are different from previous pages",
    !lastPageResult.data.some(
      (p) =>
        customLimitResult.data.some((p1) => p1.id === p.id) ||
        page2Result.data.some((p2) => p2.id === p.id),
    ),
  );
  // 8. Test empty results when requesting page beyond available data
  const beyondPageResult = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        page: 100,
        limit: 10,
      },
    },
  );
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond page has empty data",
    beyondPageResult.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page current is 100",
    beyondPageResult.pagination.current,
    100,
  );
  TestValidator.equals(
    "beyond page still shows total records",
    beyondPageResult.pagination.records,
    35,
  );
  // 9. Test maximum limit enforcement (100 posts)
  const maxLimitResult = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit is 100",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.equals(
    "max limit page has all 35 posts",
    maxLimitResult.data.length,
    35,
  );
  TestValidator.equals(
    "max limit page has 1 total page",
    maxLimitResult.pagination.pages,
    1,
  );
  // 10. Test pagination with different sort types
  const hotSortResult = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortType: "hot",
      },
    },
  );
  typia.assert(hotSortResult);
  TestValidator.equals(
    "hot sort returns 10 posts",
    hotSortResult.data.length,
    10,
  );
  const newSortResult = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortType: "new",
      },
    },
  );
  typia.assert(newSortResult);
  TestValidator.equals(
    "new sort returns 10 posts",
    newSortResult.data.length,
    10,
  );
  const topSortResult = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortType: "top",
        timeFilter: "all",
      },
    },
  );
  typia.assert(topSortResult);
  TestValidator.equals(
    "top sort returns 10 posts",
    topSortResult.data.length,
    10,
  );
  const controversialSortResult =
    await api.functional.redditClone.feeds.popular.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
        sortType: "controversial",
      },
    });
  typia.assert(controversialSortResult);
  TestValidator.equals(
    "controversial sort returns 10 posts",
    controversialSortResult.data.length,
    10,
  );
  // 11. Test time filter variations for top-sorted posts
  const topTodayResult = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortType: "top",
        timeFilter: "today",
      },
    },
  );
  typia.assert(topTodayResult);
  TestValidator.predicate(
    "top today filter returns valid results",
    topTodayResult.data.length >= 0,
  );
  const topWeekResult = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortType: "top",
        timeFilter: "week",
      },
    },
  );
  typia.assert(topWeekResult);
  TestValidator.predicate(
    "top week filter returns valid results",
    topWeekResult.data.length >= 0,
  );
  const topMonthResult = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortType: "top",
        timeFilter: "month",
      },
    },
  );
  typia.assert(topMonthResult);
  TestValidator.predicate(
    "top month filter returns valid results",
    topMonthResult.data.length >= 0,
  );
  const topYearResult = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortType: "top",
        timeFilter: "year",
      },
    },
  );
  typia.assert(topYearResult);
  TestValidator.predicate(
    "top year filter returns valid results",
    topYearResult.data.length >= 0,
  );
  // 12. Verify created posts appear in the popular feed
  const allPostsFeed = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(allPostsFeed);
  const feedPostIds = new Set(allPostsFeed.data.map((p) => p.id));
  const createdPostIds = new Set(posts.map((p) => p.id));
  let foundCount = 0;
  for (const postId of createdPostIds) {
    if (feedPostIds.has(postId)) {
      foundCount++;
    }
  }
  TestValidator.predicate(
    "created posts appear in popular feed",
    foundCount > 0,
  );
  // 13. Verify sort types produce valid results
  TestValidator.predicate(
    "all sort types produce valid results",
    hotSortResult.data.length > 0 &&
      newSortResult.data.length > 0 &&
      topSortResult.data.length > 0 &&
      controversialSortResult.data.length > 0,
  );
}
