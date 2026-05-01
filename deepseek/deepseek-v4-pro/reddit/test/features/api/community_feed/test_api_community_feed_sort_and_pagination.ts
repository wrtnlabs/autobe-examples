import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test community feed sorting and pagination across all sort modes, time filters, and page controls.
 *
 * Validates that the community feed endpoint correctly applies four distinct sort modes — new (chronological), hot (engagement-weighted), top (vote-score ranked), and controversial (high-discussion) — respects time window filters (today, week, month, year, all) when sorting by top, and properly handles pagination including boundary conditions where requesting a page beyond available pages returns an empty result set.
 *
 * Special attention is given to verifying that time filters are silently ignored for non-top sort modes and that pagination metadata accurately reflects the total record count, page count, and current position.
 *
 * 1. Member registers, creates "SortTestCommunity", subscribes, and creates six posts.
 * 2. Sort by 'new' verifies posts are in reverse chronological order.
 * 3. Sort by 'hot' verifies engagement-weighted ranking returns valid results.
 * 4. Sort by 'top' with time='all' verifies all posts included.
 * 5. Sort by 'top' with time='today' verifies today-only window.
 * 6. Sort by 'top' with time='week' verifies past-7-day window.
 * 7. Sort by 'top' with time='month' verifies past-30-day window.
 * 8. Sort by 'top' with time='year' verifies past-365-day window.
 * 9. Sort by 'controversial' verifies discussion-weighted ranking returns valid results.
 * 10. Pagination page=1, limit=2 verifies metadata, item count, and pagination fields.
 * 11. Page=2, limit=2 verifies different post set and current page.
 * 12. Boundary page beyond total pages verifies empty data array.
 * 13. Time filter on non-top sort verifies it is silently ignored.
 */
export async function test_api_community_feed_sort_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      { body: { name: "SortTestCommunity" } },
    );
  // 3. Subscribe to community
  await api.functional.communityHub.member.communities.subscriptions.create(
    memberConnection,
    { communityName: community.name },
  );
  // 4. Create 6 posts sequentially
  const posts = await ArrayUtil.asyncRepeat(6, (i) =>
    generate_random_community_hub_communities_posts_create(memberConnection, {
      params: { communityName: community.name },
      body: {
        type: "text",
        title: `Feed Sort Test Post ${i + 1}`,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    }),
  );
  // Public connection for feed access (no auth required)
  const publicConnection: api.IConnection = { host: connection.host };
  // 5. Sort by 'new': reverse chronological order
  const newFeed = await api.functional.communityHub.communities.feed.index(
    publicConnection,
    {
      communityName: community.name,
      body: { sort: "new" },
    },
  );
  typia.assert(newFeed);
  TestValidator.predicate(
    "new sort: returns all posts",
    newFeed.data.length === posts.length,
  );
  for (let i = 0; i < newFeed.data.length - 1; i++) {
    TestValidator.predicate(
      "new sort: posts in reverse chronological order",
      newFeed.data[i].created_at >= newFeed.data[i + 1].created_at,
    );
  }
  // 6. Sort by 'hot': engagement-weighted recency
  const hotFeed = await api.functional.communityHub.communities.feed.index(
    publicConnection,
    {
      communityName: community.name,
      body: { sort: "hot" },
    },
  );
  typia.assert(hotFeed);
  TestValidator.predicate("hot sort: returns posts", hotFeed.data.length > 0);
  // 7. Sort by 'top' with time='all': all posts by vote_score desc
  const topAllFeed = await api.functional.communityHub.communities.feed.index(
    publicConnection,
    {
      communityName: community.name,
      body: { sort: "top", time: "all" },
    },
  );
  typia.assert(topAllFeed);
  TestValidator.equals(
    "top all: all posts included",
    topAllFeed.pagination.records,
    posts.length,
  );
  // 8. Sort by 'top' with time='today': only today's posts
  const topTodayFeed = await api.functional.communityHub.communities.feed.index(
    publicConnection,
    {
      communityName: community.name,
      body: { sort: "top", time: "today" },
    },
  );
  typia.assert(topTodayFeed);
  TestValidator.equals(
    "top today: all posts created today appear",
    topTodayFeed.pagination.records,
    posts.length,
  );
  // 9. Sort by 'top' with time='week': past 7 days
  const topWeekFeed = await api.functional.communityHub.communities.feed.index(
    publicConnection,
    {
      communityName: community.name,
      body: { sort: "top", time: "week" },
    },
  );
  typia.assert(topWeekFeed);
  TestValidator.equals(
    "top week: posts from past 7 days",
    topWeekFeed.pagination.records,
    posts.length,
  );
  // 10. Sort by 'top' with time='month': past 30 days
  const topMonthFeed = await api.functional.communityHub.communities.feed.index(
    publicConnection,
    {
      communityName: community.name,
      body: { sort: "top", time: "month" },
    },
  );
  typia.assert(topMonthFeed);
  TestValidator.equals(
    "top month: posts from past 30 days",
    topMonthFeed.pagination.records,
    posts.length,
  );
  // 11. Sort by 'top' with time='year': past 365 days
  const topYearFeed = await api.functional.communityHub.communities.feed.index(
    publicConnection,
    {
      communityName: community.name,
      body: { sort: "top", time: "year" },
    },
  );
  typia.assert(topYearFeed);
  TestValidator.equals(
    "top year: posts from past 365 days",
    topYearFeed.pagination.records,
    posts.length,
  );
  // 12. Sort by 'controversial': high discussion, divided voting
  const controversialFeed =
    await api.functional.communityHub.communities.feed.index(publicConnection, {
      communityName: community.name,
      body: { sort: "controversial" },
    });
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial sort: returns posts",
    controversialFeed.data.length > 0,
  );
  // 13. Pagination: page=1, limit=2
  const page1 = await api.functional.communityHub.communities.feed.index(
    publicConnection,
    {
      communityName: community.name,
      body: { sort: "new", page: 1, limit: 2 },
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1: current page", page1.pagination.current, 1);
  TestValidator.equals("page 1: limit", page1.pagination.limit, 2);
  TestValidator.equals(
    "page 1: total records",
    page1.pagination.records,
    posts.length,
  );
  TestValidator.equals(
    "page 1: total pages",
    page1.pagination.pages,
    Math.ceil(posts.length / 2),
  );
  TestValidator.predicate(
    "page 1: at most limit items",
    page1.data.length <= 2,
  );
  // 14. Pagination: page=2, limit=2
  const page2 = await api.functional.communityHub.communities.feed.index(
    publicConnection,
    {
      communityName: community.name,
      body: { sort: "new", page: 2, limit: 2 },
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2: current page", page2.pagination.current, 2);
  TestValidator.predicate("page 2: different posts from page 1", () => {
    if (page2.data.length === 0) {
      return true;
    }
    const page1Ids = new Set(page1.data.map((p) => p.id));
    return page2.data.every((p) => !page1Ids.has(p.id));
  });
  // 15. Boundary: page beyond total pages returns empty data
  const pageBeyond = await api.functional.communityHub.communities.feed.index(
    publicConnection,
    {
      communityName: community.name,
      body: { sort: "new", page: 100, limit: 2 },
    },
  );
  typia.assert(pageBeyond);
  TestValidator.equals(
    "beyond-boundary page: empty data array",
    pageBeyond.data.length,
    0,
  );
  TestValidator.equals(
    "beyond-boundary page: total records unchanged",
    pageBeyond.pagination.records,
    posts.length,
  );
  // 16. Time filter ignored on non-top sort
  const newWithTime = await api.functional.communityHub.communities.feed.index(
    publicConnection,
    {
      communityName: community.name,
      body: { sort: "new", time: "today" },
    },
  );
  typia.assert(newWithTime);
  TestValidator.equals(
    "new sort with time filter: all posts returned (time ignored)",
    newWithTime.pagination.records,
    posts.length,
  );
}
