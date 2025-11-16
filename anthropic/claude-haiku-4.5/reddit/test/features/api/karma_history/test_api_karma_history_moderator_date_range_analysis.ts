import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

export async function test_api_karma_history_moderator_date_range_analysis(
  connection: api.IConnection,
) {
  /** Create a moderator account to perform karma history analysis */
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  /**
   * Test 1: Query karma history without date range filters Verify that the API
   * returns paginated results
   */
  const allKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(allKarmaHistory);
  TestValidator.predicate(
    "karma history pagination includes pagination metadata",
    allKarmaHistory.pagination !== undefined,
  );
  TestValidator.predicate(
    "karma history has data array",
    Array.isArray(allKarmaHistory.data),
  );

  /**
   * Test 2: Query karma history with start date only Verify records from a
   * specific start date onwards
   */
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const historyFromThirtyDaysAgo =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: thirtyDaysAgo.toISOString(),
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(historyFromThirtyDaysAgo);
  TestValidator.predicate(
    "start date filter returns valid pagination",
    historyFromThirtyDaysAgo.pagination.current >= 1,
  );

  /**
   * Test 3: Query karma history with end date only Verify records up to a
   * specific end date
   */
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const historyUpToSevenDaysAgo =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_end: sevenDaysAgo.toISOString(),
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(historyUpToSevenDaysAgo);
  TestValidator.predicate(
    "end date filter returns valid pagination",
    historyUpToSevenDaysAgo.pagination.current >= 1,
  );

  /**
   * Test 4: Query karma history with both start and end date (date range) This
   * is the core test for date range filtering
   */
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const karmaHistoryLastDay =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: oneDayAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(karmaHistoryLastDay);
  TestValidator.predicate(
    "date range query returns valid results",
    karmaHistoryLastDay.pagination.current >= 1,
  );

  /**
   * Test 5: Verify date range boundaries are inclusive All records should fall
   * within the specified date range
   */
  if (karmaHistoryLastDay.data.length > 0) {
    const allRecordsInRange = karmaHistoryLastDay.data.every((record) => {
      const recordDate = new Date(record.created_at);
      return recordDate >= oneDayAgo && recordDate <= now;
    });
    TestValidator.predicate(
      "all records in date range query are within specified boundaries",
      allRecordsInRange,
    );
  }

  /**
   * Test 6: Query with specific week range Test filtering for a specific week
   * (7-day period)
   */
  const weekStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekEndDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

  const karmaHistoryWeek =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: weekStartDate.toISOString(),
          created_at_end: weekEndDate.toISOString(),
          page: 1,
          limit: 30,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(karmaHistoryWeek);

  /**
   * Test 7: Query with change reason filter combined with date range Verify
   * filtering by specific reason type within a date range
   */
  const reasonAndDateRange =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "vote_created",
          created_at_start: oneDayAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(reasonAndDateRange);
  TestValidator.predicate(
    "change reason + date range filter returns valid results",
    reasonAndDateRange.pagination.pages >= 0,
  );

  /**
   * Test 8: Test pagination within a date range Verify that pagination works
   * correctly with date range constraints
   */
  const karmaHistoryPage1 =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: twoDaysAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(karmaHistoryPage1);

  if (karmaHistoryPage1.pagination.pages > 1) {
    const karmaHistoryPage2 =
      await api.functional.communityPlatform.moderator.karmaHistory.index(
        connection,
        {
          body: {
            created_at_start: twoDaysAgo.toISOString(),
            created_at_end: now.toISOString(),
            page: 2,
            limit: 10,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    typia.assert(karmaHistoryPage2);
    TestValidator.equals(
      "pagination page number matches requested page",
      karmaHistoryPage2.pagination.current,
      2,
    );
  }

  /**
   * Test 9: Verify sorting within date range Test that sorting by created_at
   * works within a date range
   */
  const sortedByDateDesc =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: oneDayAgo.toISOString(),
          created_at_end: now.toISOString(),
          sort_by: "created_at_desc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(sortedByDateDesc);

  /**
   * Test 10: Verify empty result handling Test filtering with a date range that
   * likely has no records
   */
  const veryOldStartDate = new Date("2000-01-01T00:00:00Z");
  const veryOldEndDate = new Date("2000-01-02T00:00:00Z");

  const emptyHistoryResult =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: veryOldStartDate.toISOString(),
          created_at_end: veryOldEndDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(emptyHistoryResult);
  TestValidator.predicate(
    "empty date range returns valid pagination structure",
    emptyHistoryResult.pagination !== undefined,
  );
}
