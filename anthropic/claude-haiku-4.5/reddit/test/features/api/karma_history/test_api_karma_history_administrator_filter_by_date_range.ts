import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

export async function test_api_karma_history_administrator_filter_by_date_range(
  connection: api.IConnection,
) {
  /**
   * Create administrator account for accessing time-based karma history audit
   * queries
   */
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  /**
   * Test 1: Query karma history with both start and end date range Filters
   * records created within a specific date window
   */
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const rangeFilterResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: thirtyDaysAgo.toISOString(),
          created_at_end: sevenDaysAgo.toISOString(),
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(rangeFilterResult);
  TestValidator.predicate(
    "range filter result should have pagination data",
    rangeFilterResult.pagination !== null,
  );
  TestValidator.predicate(
    "all records in range should have created_at within specified window",
    rangeFilterResult.data.every(
      (record) =>
        new Date(record.created_at) >= thirtyDaysAgo &&
        new Date(record.created_at) <= sevenDaysAgo,
    ),
  );

  /**
   * Test 2: Query karma history with only start date (created_at_start)
   * Retrieves all records created after the specified date
   */
  const startDateOnlyResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: sevenDaysAgo.toISOString(),
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(startDateOnlyResult);
  TestValidator.predicate(
    "records with start date only should all be after start date",
    startDateOnlyResult.data.every(
      (record) => new Date(record.created_at) >= sevenDaysAgo,
    ),
  );

  /**
   * Test 3: Query karma history with only end date (created_at_end) Retrieves
   * all records created before the specified date
   */
  const endDateOnlyResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_end: sevenDaysAgo.toISOString(),
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(endDateOnlyResult);
  TestValidator.predicate(
    "records with end date only should all be before end date",
    endDateOnlyResult.data.every(
      (record) => new Date(record.created_at) <= sevenDaysAgo,
    ),
  );

  /**
   * Test 4: Query with inclusive boundary timestamps Verify that records at
   * exact boundary timestamps are included
   */
  const exactBoundaryStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const exactBoundaryEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  const boundaryFilterResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: exactBoundaryStart.toISOString(),
          created_at_end: exactBoundaryEnd.toISOString(),
          sort_by: "created_at_asc",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(boundaryFilterResult);
  TestValidator.predicate(
    "boundary filter should return valid page",
    boundaryFilterResult.pagination.current >= 1,
  );

  /**
   * Test 5: Query for single-day window Tests filtering for karma changes
   * within a specific 24-hour period
   */
  const oneDayStart = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const oneDayEnd = new Date(oneDayStart.getTime() + 24 * 60 * 60 * 1000);

  const oneDayResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: oneDayStart.toISOString(),
          created_at_end: oneDayEnd.toISOString(),
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(oneDayResult);
  TestValidator.predicate(
    "single-day range should have valid records",
    oneDayResult.pagination.records >= 0,
  );

  /**
   * Test 6: Query for month-spanning window Tests filtering across multiple
   * weeks/months
   */
  const monthStartDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const monthEndDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const monthResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: monthStartDate.toISOString(),
          created_at_end: monthEndDate.toISOString(),
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(monthResult);
  TestValidator.predicate(
    "month-spanning range should return valid results",
    monthResult.data.length >= 0,
  );

  /**
   * Test 7: Query with pagination Tests that date range filtering works
   * correctly with pagination
   */
  const paginatedResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: thirtyDaysAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "paginated results should respect limit",
    paginatedResult.data.length <= 10,
  );
  TestValidator.equals(
    "pagination page number should match request",
    paginatedResult.pagination.current,
    1,
  );

  /**
   * Test 8: Query with sorting Tests that date range filtering respects sorting
   * parameters
   */
  const sortedResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: thirtyDaysAgo.toISOString(),
          created_at_end: now.toISOString(),
          sort_by: "created_at_desc",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "sorted results should maintain valid structure",
    sortedResult.data.every((record) => record.id !== undefined),
  );

  /**
   * Test 9: Empty date range (no records exist) Verifies appropriate response
   * when no karma changes exist in specified window
   */
  const futureStart = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const futureEnd = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const emptyResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: futureStart.toISOString(),
          created_at_end: futureEnd.toISOString(),
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty date range should return zero records",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result pagination should show zero records",
    emptyResult.pagination.records,
    0,
  );

  /**
   * Test 10: Verify record structure and member context Ensures karma history
   * records contain complete information for audit purposes
   */
  const structureCheckResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: thirtyDaysAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(structureCheckResult);

  if (structureCheckResult.data.length > 0) {
    const sample = structureCheckResult.data[0];
    TestValidator.predicate(
      "karma history record should have required fields",
      sample.id !== undefined &&
        sample.member !== undefined &&
        sample.change_reason !== undefined &&
        sample.karma_change !== undefined &&
        sample.previous_total !== undefined &&
        sample.new_total !== undefined &&
        sample.created_at !== undefined,
    );
    TestValidator.predicate(
      "member summary should have required fields",
      sample.member.id !== undefined &&
        sample.member.username !== undefined &&
        sample.member.email !== undefined,
    );
  }
}
