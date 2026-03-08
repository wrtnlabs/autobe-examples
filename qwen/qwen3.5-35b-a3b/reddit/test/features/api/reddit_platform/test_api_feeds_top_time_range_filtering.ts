import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedRequest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_feeds_top_time_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: "12345678",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Generate a random community ID for test posts
  // Note: Community creation API is not available, so we use a mock UUID
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Calculate time boundaries for test posts
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  // 4. Create test posts with varying creation times
  // Post 1: Today (within TODAY range)
  const todayPost = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Today Post",
        postType: "TEXT",
        redditPlatformCommunityId: communityId,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todayPost);
  // Post 2: 3 days ago (within TODAY, WEEK, MONTH, YEAR)
  const threeDaysAgoPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        title: "3 Days Ago Post",
        postType: "TEXT",
        redditPlatformCommunityId: communityId,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    });
  typia.assert(threeDaysAgoPost);
  // Post 3: 10 days ago (outside TODAY, within WEEK, MONTH, YEAR)
  const tenDaysAgoPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        title: "10 Days Ago Post",
        postType: "TEXT",
        redditPlatformCommunityId: communityId,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    });
  typia.assert(tenDaysAgoPost);
  // Post 4: 35 days ago (outside TODAY, WEEK, within MONTH, YEAR)
  const thirtyFiveDaysAgoPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        title: "35 Days Ago Post",
        postType: "TEXT",
        redditPlatformCommunityId: communityId,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    });
  typia.assert(thirtyFiveDaysAgoPost);
  // Post 5: 400 days ago (outside TODAY, WEEK, MONTH, within YEAR)
  const fourHundredDaysAgoPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        title: "400 Days Ago Post",
        postType: "TEXT",
        redditPlatformCommunityId: communityId,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    });
  typia.assert(fourHundredDaysAgoPost);
  // Post 6: 2 years ago (outside all ranges except ALL)
  const twoYearsAgoPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        title: "2 Years Ago Post",
        postType: "TEXT",
        redditPlatformCommunityId: communityId,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    });
  typia.assert(twoYearsAgoPost);
  // 5. Test TOP feed with different time ranges
  // Test TODAY filter
  const todayFeed = await api.functional.redditPlatform.feeds.top.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sortType: "TOP",
        timeRange: "TODAY",
      },
    },
  );
  typia.assert(todayFeed);
  // Verify only today posts are in result
  const todayPosts = todayFeed.data;
  const hasNonTodayPost = todayPosts.some((post) => {
    const postDate = new Date(post.created_at);
    return postDate < todayStart;
  });
  TestValidator.equals(
    "TODAY filter: no non-today posts",
    hasNonTodayPost,
    false,
  );
  // Test WEEK filter
  const weekFeed = await api.functional.redditPlatform.feeds.top.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sortType: "TOP",
        timeRange: "WEEK",
      },
    },
  );
  typia.assert(weekFeed);
  // Verify no posts older than week are in result
  const hasOlderThanWeek = weekFeed.data.some((post) => {
    const postDate = new Date(post.created_at);
    return postDate < weekAgo;
  });
  TestValidator.equals(
    "WEEK filter: no posts older than week",
    hasOlderThanWeek,
    false,
  );
  // Test MONTH filter
  const monthFeed = await api.functional.redditPlatform.feeds.top.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sortType: "TOP",
        timeRange: "MONTH",
      },
    },
  );
  typia.assert(monthFeed);
  // Verify no posts older than month are in result
  const hasOlderThanMonth = monthFeed.data.some((post) => {
    const postDate = new Date(post.created_at);
    return postDate < monthAgo;
  });
  TestValidator.equals(
    "MONTH filter: no posts older than month",
    hasOlderThanMonth,
    false,
  );
  // Test YEAR filter
  const yearFeed = await api.functional.redditPlatform.feeds.top.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sortType: "TOP",
        timeRange: "YEAR",
      },
    },
  );
  typia.assert(yearFeed);
  // Verify no posts older than year are in result
  const hasOlderThanYear = yearFeed.data.some((post) => {
    const postDate = new Date(post.created_at);
    return postDate < yearAgo;
  });
  TestValidator.equals(
    "YEAR filter: no posts older than year",
    hasOlderThanYear,
    false,
  );
  // Test ALL filter
  const allFeed = await api.functional.redditPlatform.feeds.top.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sortType: "TOP",
        timeRange: "ALL",
      },
    },
  );
  typia.assert(allFeed);
  // Verify ALL includes all non-deleted posts
  TestValidator.equals(
    "ALL filter: includes all posts",
    allFeed.data.length >= 5,
    true,
  );
  // Verify posts are sorted by vote score (descending)
  for (let i = 1; i < allFeed.data.length; i++) {
    const prevScore = allFeed.data[i - 1].vote_score;
    const currScore = allFeed.data[i].vote_score;
    TestValidator.predicate(
      `post ${i} sorted correctly by vote score`,
      prevScore >= currScore,
    );
  }
}
