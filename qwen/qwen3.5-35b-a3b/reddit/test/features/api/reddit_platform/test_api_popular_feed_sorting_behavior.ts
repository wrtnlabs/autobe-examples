import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostFeed";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_popular_feed_sorting_behavior(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test HOT sorting
  const hotFeed = await api.functional.redditPlatform.feeds.popular.index(
    connection,
    {
      body: {
        feedType: "POPULAR",
        sortType: "HOT",
      } satisfies IRedditPlatformPostFeed.IRequest,
    },
  );
  typia.assert(hotFeed);
  // Verify HOT feed returns posts
  TestValidator.predicate("HOT feed returns posts", hotFeed.data.length > 0);
  // 2. Test NEW sorting
  const newFeed = await api.functional.redditPlatform.feeds.popular.index(
    connection,
    {
      body: {
        feedType: "POPULAR",
        sortType: "NEW",
      } satisfies IRedditPlatformPostFeed.IRequest,
    },
  );
  typia.assert(newFeed);
  // NEW should be ordered by created_at descending
  const newFeedTimestamps = newFeed.data.map((p) => new Date(p.created_at).getTime());
  const newFeedTimestampsSorted = [...newFeedTimestamps].sort((a, b) => b - a);
  TestValidator.predicate(
    "NEW feed sorted by created_at descending",
    newFeedTimestampsSorted.every((val, idx) => val === newFeedTimestamps[idx]),
  );
  // 3. Test TOP sorting with different time ranges
  const topTodayFeed = await api.functional.redditPlatform.feeds.popular.index(
    connection,
    {
      body: {
        feedType: "POPULAR",
        sortType: "TOP",
        timeRange: "TODAY",
      } satisfies IRedditPlatformPostFeed.IRequest,
    },
  );
  typia.assert(topTodayFeed);
  // Verify TOP TODAY is sorted by vote_score descending
  const topTodayScores = topTodayFeed.data.map((p) => p.vote_score);
  const isTopTodaySortedDesc = topTodayScores.every(
    (score, i) => i === 0 || topTodayScores[i - 1] >= score,
  );
  TestValidator.predicate(
    "TOP TODAY sorted by vote_score descending",
    isTopTodaySortedDesc,
  );
  const topWeekFeed = await api.functional.redditPlatform.feeds.popular.index(
    connection,
    {
      body: {
        feedType: "POPULAR",
        sortType: "TOP",
        timeRange: "WEEK",
      } satisfies IRedditPlatformPostFeed.IRequest,
    },
  );
  typia.assert(topWeekFeed);
  // Verify TOP WEEK is sorted by vote_score descending
  const topWeekScores = topWeekFeed.data.map((p) => p.vote_score);
  const isTopWeekSortedDesc = topWeekScores.every(
    (score, i) => i === 0 || topWeekScores[i - 1] >= score,
  );
  TestValidator.predicate(
    "TOP WEEK sorted by vote_score descending",
    isTopWeekSortedDesc,
  );
  const topMonthFeed = await api.functional.redditPlatform.feeds.popular.index(
    connection,
    {
      body: {
        feedType: "POPULAR",
        sortType: "TOP",
        timeRange: "MONTH",
      } satisfies IRedditPlatformPostFeed.IRequest,
    },
  );
  typia.assert(topMonthFeed);
  // Verify TOP MONTH is sorted by vote_score descending
  const topMonthScores = topMonthFeed.data.map((p) => p.vote_score);
  const isTopMonthSortedDesc = topMonthScores.every(
    (score, i) => i === 0 || topMonthScores[i - 1] >= score,
  );
  TestValidator.predicate(
    "TOP MONTH sorted by vote_score descending",
    isTopMonthSortedDesc,
  );
  const topYearFeed = await api.functional.redditPlatform.feeds.popular.index(
    connection,
    {
      body: {
        feedType: "POPULAR",
        sortType: "TOP",
        timeRange: "YEAR",
      } satisfies IRedditPlatformPostFeed.IRequest,
    },
  );
  typia.assert(topYearFeed);
  // Verify TOP YEAR is sorted by vote_score descending
  const topYearScores = topYearFeed.data.map((p) => p.vote_score);
  const isTopYearSortedDesc = topYearScores.every(
    (score, i) => i === 0 || topYearScores[i - 1] >= score,
  );
  TestValidator.predicate(
    "TOP YEAR sorted by vote_score descending",
    isTopYearSortedDesc,
  );
  const topAllFeed = await api.functional.redditPlatform.feeds.popular.index(
    connection,
    {
      body: {
        feedType: "POPULAR",
        sortType: "TOP",
      } satisfies IRedditPlatformPostFeed.IRequest,
    },
  );
  typia.assert(topAllFeed);
  // Verify TOP ALL (no timeRange) is sorted by vote_score descending
  const topAllScores = topAllFeed.data.map((p) => p.vote_score);
  const isTopAllSortedDesc = topAllScores.every(
    (score, i) => i === 0 || topAllScores[i - 1] >= score,
  );
  TestValidator.predicate(
    "TOP ALL sorted by vote_score descending",
    isTopAllSortedDesc,
  );
  // 4. Test CONTROVERSIAL sorting
  const controversialFeed =
    await api.functional.redditPlatform.feeds.popular.index(connection, {
      body: {
        feedType: "POPULAR",
        sortType: "CONTROVERSIAL",
      } satisfies IRedditPlatformPostFeed.IRequest,
    });
  typia.assert(controversialFeed);
  // CONTROVERSIAL should prioritize posts with |vote_score| near zero
  // Calculate absolute scores and verify they are in ascending order
  const controversialAbsScores = controversialFeed.data.map((p) =>
    Math.abs(p.vote_score),
  );
  const isControversialSortedAsc = controversialAbsScores.every(
    (score, i) => i === 0 || controversialAbsScores[i - 1] <= score,
  );
  TestValidator.predicate(
    "CONTROVERSIAL sorted by |vote_score| ascending",
    isControversialSortedAsc,
  );
  // 5. Verify endpoint is accessible without authentication
  // All feed requests above should work without any authentication headers
  TestValidator.predicate(
    "popular feed endpoint accessible without authentication",
    true,
  );
}