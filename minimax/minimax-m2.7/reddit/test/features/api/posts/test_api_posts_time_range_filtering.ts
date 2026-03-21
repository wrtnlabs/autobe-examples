import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_posts_time_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test time range filtering with "top" sort
  // Fetch posts with timeRange="all" (no filter)
  const postsAllTop = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "top",
      timeRange: "all",
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(postsAllTop);
  // Fetch posts with timeRange="day" (last 24 hours)
  const postsDayTop = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "top",
      timeRange: "day",
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(postsDayTop);
  // Fetch posts with timeRange="week" (last 7 days)
  const postsWeekTop = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "top",
        timeRange: "week",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(postsWeekTop);
  // Fetch posts with timeRange="month" (last 30 days)
  const postsMonthTop = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "top",
        timeRange: "month",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(postsMonthTop);
  // Fetch posts with timeRange="year" (last 365 days)
  const postsYearTop = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "top",
        timeRange: "year",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(postsYearTop);
  // Validate: time windows are nested (all >= year >= month >= week >= day)
  TestValidator.predicate(
    "posts with 'all' filter should have >= posts than 'year' filter",
    postsAllTop.data.length >= postsYearTop.data.length,
  );
  TestValidator.predicate(
    "posts with 'year' filter should have >= posts than 'month' filter",
    postsYearTop.data.length >= postsMonthTop.data.length,
  );
  TestValidator.predicate(
    "posts with 'month' filter should have >= posts than 'week' filter",
    postsMonthTop.data.length >= postsWeekTop.data.length,
  );
  TestValidator.predicate(
    "posts with 'week' filter should have >= posts than 'day' filter",
    postsWeekTop.data.length >= postsDayTop.data.length,
  );
  // Calculate cutoff times to validate posts are within range
  const now = new Date();
  const dayCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const yearCutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  // Validate day filter: all posts should be within last 24 hours
  for (const post of postsDayTop.data) {
    const createdAt = new Date(post.created_at);
    TestValidator.predicate(
      `Post with timeRange=day should be created within last 24 hours (post id: ${post.id})`,
      createdAt >= dayCutoff,
    );
  }
  // Validate week filter: all posts should be within last 7 days
  for (const post of postsWeekTop.data) {
    const createdAt = new Date(post.created_at);
    TestValidator.predicate(
      `Post with timeRange=week should be created within last 7 days (post id: ${post.id})`,
      createdAt >= weekCutoff,
    );
  }
  // Validate month filter: all posts should be within last 30 days
  for (const post of postsMonthTop.data) {
    const createdAt = new Date(post.created_at);
    TestValidator.predicate(
      `Post with timeRange=month should be created within last 30 days (post id: ${post.id})`,
      createdAt >= monthCutoff,
    );
  }
  // Validate year filter: all posts should be within last 365 days
  for (const post of postsYearTop.data) {
    const createdAt = new Date(post.created_at);
    TestValidator.predicate(
      `Post with timeRange=year should be created within last 365 days (post id: ${post.id})`,
      createdAt >= yearCutoff,
    );
  }
  // 2. Test time range filtering with "controversial" sort
  // Fetch posts with sort="controversial" and timeRange="all"
  const postsAllControversial = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "controversial",
        timeRange: "all",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(postsAllControversial);
  // Fetch posts with sort="controversial" and timeRange="day"
  const postsDayControversial = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "controversial",
        timeRange: "day",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(postsDayControversial);
  // Validate: controversial sort should also respect time range
  TestValidator.predicate(
    "posts with 'all' filter should have >= posts than 'day' filter (controversial)",
    postsAllControversial.data.length >= postsDayControversial.data.length,
  );
  // Validate day filter for controversial: all posts should be within last 24 hours
  for (const post of postsDayControversial.data) {
    const createdAt = new Date(post.created_at);
    TestValidator.predicate(
      `Controversial post with timeRange=day should be within last 24 hours (post id: ${post.id})`,
      createdAt >= dayCutoff,
    );
  }
  // 3. Test that timeRange has no effect with "hot" sort
  // Fetch posts with sort="hot" and timeRange="day"
  const postsHotDay = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "hot",
      timeRange: "day",
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(postsHotDay);
  // Fetch posts with sort="hot" and timeRange="all"
  const postsHotAll = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "hot",
      timeRange: "all",
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(postsHotAll);
  // For hot sort, timeRange should be ignored, so results might differ in order
  // but should both return valid posts (not necessarily same count due to hot algorithm)
  TestValidator.predicate(
    "hot sort with timeRange=day should return valid posts",
    postsHotDay.data.length > 0 || postsHotAll.data.length === 0,
  );
  // 4. Test that timeRange has no effect with "new" sort
  // Fetch posts with sort="new" and timeRange="day"
  const postsNewDay = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "new",
      timeRange: "day",
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(postsNewDay);
  // Fetch posts with sort="new" and timeRange="all"
  const postsNewAll = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "new",
      timeRange: "all",
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(postsNewAll);
  // For new sort, timeRange should be ignored
  TestValidator.predicate(
    "new sort with timeRange=day should return valid posts",
    postsNewDay.data.length > 0 || postsNewAll.data.length === 0,
  );
}
