import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_popular_feed_sort_modes_and_timeframe(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test all four sort modes (Hot, New, Top, Controversial) and the Top
   * timeframe filter (hour, today, week, month, year, all) for the Popular
   * Feed endpoint.
   *
   * Validates response structure via typia.assert and ordering semantics
   * for New (chronological descending) and Top (score descending) modes.
   * Edge case: Top hour may return empty data — validates empty page
   * returns valid response with zero records.
   */
  const feed = api.functional.communityPlatform.posts.feeds.popular.index;
  // ---------------------------------------------------------------
  //  1. HOT SORT (default)
  // ---------------------------------------------------------------
  const hot = await feed(connection, {
    body: {
      sort: "hot",
    } satisfies ICommunityPlatformPost.IRequest,
  });
  typia.assert(hot);
  // ---------------------------------------------------------------
  //  2. NEW SORT — validate chronological descending order
  // ---------------------------------------------------------------
  const newest = await feed(connection, {
    body: {
      sort: "new",
    } satisfies ICommunityPlatformPost.IRequest,
  });
  typia.assert(newest);
  // Validate ordering: each post's created_at >= next post's created_at
  for (let i: number = 1; i < newest.data.length; ++i) {
    TestValidator.predicate(
      `post[${i - 1}] is newer than post[${i}]`,
      () =>
        new Date(newest.data[i - 1]!.created_at).getTime() >=
        new Date(newest.data[i]!.created_at).getTime(),
    );
  }
  // ---------------------------------------------------------------
  //  3. TOP SORT — validate all timeframes
  // ---------------------------------------------------------------
  // 3a. Top with "all" timeframe — score descending
  const topAll = await feed(connection, {
    body: {
      sort: "top",
      timeframe: "all",
    } satisfies ICommunityPlatformPost.IRequest,
  });
  typia.assert(topAll);
  for (let i: number = 1; i < topAll.data.length; ++i) {
    TestValidator.predicate(
      `top-all: post[${i - 1}] score >= post[${i}] score`,
      () => topAll.data[i - 1]!.vote_score >= topAll.data[i]!.vote_score,
    );
  }
  // 3b. Top with "month" timeframe
  const topMonth = await feed(connection, {
    body: {
      sort: "top",
      timeframe: "month",
    } satisfies ICommunityPlatformPost.IRequest,
  });
  typia.assert(topMonth);
  // 3c. Top with "week" timeframe
  const topWeek = await feed(connection, {
    body: {
      sort: "top",
      timeframe: "week",
    } satisfies ICommunityPlatformPost.IRequest,
  });
  typia.assert(topWeek);
  // 3d. Top with "today" timeframe
  const topToday = await feed(connection, {
    body: {
      sort: "top",
      timeframe: "today",
    } satisfies ICommunityPlatformPost.IRequest,
  });
  typia.assert(topToday);
  // 3e. Top with "year" timeframe
  const topYear = await feed(connection, {
    body: {
      sort: "top",
      timeframe: "year",
    } satisfies ICommunityPlatformPost.IRequest,
  });
  typia.assert(topYear);
  // 3f. Top with "hour" timeframe (edge case — may return empty)
  const topHour = await feed(connection, {
    body: {
      sort: "top",
      timeframe: "hour",
    } satisfies ICommunityPlatformPost.IRequest,
  });
  typia.assert(topHour);
  // ---------------------------------------------------------------
  //  4. CONTROVERSIAL SORT
  // ---------------------------------------------------------------
  const controversial = await feed(connection, {
    body: {
      sort: "controversial",
    } satisfies ICommunityPlatformPost.IRequest,
  });
  typia.assert(controversial);
  // ---------------------------------------------------------------
  //  5. Validate pagination metadata across all responses
  // ---------------------------------------------------------------
  const allPages = [
    hot,
    newest,
    topAll,
    topMonth,
    topWeek,
    topToday,
    topYear,
    topHour,
  ];
  for (const page of allPages) {
    TestValidator.predicate(
      "pagination.current >= 0",
      () => page.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination.limit > 0",
      () => page.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination.records >= 0",
      () => page.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination.pages >= 0",
      () => page.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "data.length <= limit",
      () => page.data.length <= page.pagination.limit,
    );
    TestValidator.equals(
      "records === 0 implies data.length === 0",
      page.pagination.records === 0,
      page.data.length === 0,
    );
  }
}
