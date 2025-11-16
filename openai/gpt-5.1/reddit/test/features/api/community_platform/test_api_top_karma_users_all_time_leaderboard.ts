import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers";

/**
 * Validate the public all-time top karma users leaderboard behavior.
 *
 * This test exercises the analytics endpoint that exposes a leaderboard of top
 * karma users aggregated over all time. It verifies that the endpoint can be
 * called without authentication, that the response structure matches the
 * paginated summary DTO, and that core business invariants for pagination,
 * ordering and rank sequencing are satisfied.
 *
 * Business rules validated:
 *
 * 1. Calling PATCH /communityPlatform/votingKarma/statistics/topKarmaUsers with
 *    timeWindow = "allTime" and sortBy = "totalKarma" returns a paginated page
 *    of ranked users.
 * 2. Pagination metadata (current, limit, records, pages) is consistent with the
 *    requested page and pageSize, and with the data length.
 * 3. Each leaderboard entry exposes member user summary information and non-null
 *    karma metrics (total, post, comment) along with a 1-based rank.
 * 4. Within a page, entries are ordered by decreasing total_karma and rank values
 *    start from 1 and increase sequentially.
 * 5. When there are enough records to span multiple pages, requesting the second
 *    page preserves rank continuity and does not repeat users from the first
 *    page.
 */
export async function test_api_top_karma_users_all_time_leaderboard(
  connection: api.IConnection,
) {
  // ---------------------------------------------
  // 1. Issue first-page leaderboard request
  // ---------------------------------------------
  const pageSize = 20 as const;
  const firstPageRequestBody = {
    timeWindow: "allTime",
    // No communityIds filter -> omit property entirely
    minTotalKarma: null,
    minPostKarma: null,
    minCommentKarma: null,
    page: 1,
    pageSize,
    sortBy: "totalKarma",
    sortDirection: "desc",
  } satisfies ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.IRequest;

  const firstPage: IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary =
    await api.functional.communityPlatform.votingKarma.statistics.topKarmaUsers.index(
      connection,
      {
        body: firstPageRequestBody,
      },
    );

  // Type-level verification of the response payload
  typia.assert<IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary>(
    firstPage,
  );

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  // ---------------------------------------------
  // 2. Basic pagination metadata validation
  // ---------------------------------------------
  TestValidator.equals(
    "first page: limit should match requested pageSize",
    firstPagination.limit,
    pageSize,
  );

  TestValidator.equals(
    "first page: current index should be 1",
    firstPagination.current,
    1,
  );

  TestValidator.predicate(
    "first page: records should be >= number of returned rows",
    firstPagination.records >= (firstData?.length ?? 0),
  );

  if (firstPagination.records === 0) {
    // When there are no records, data should be empty and pages should be 0.
    TestValidator.equals(
      "empty leaderboard: data array should be empty",
      firstData.length,
      0,
    );

    TestValidator.equals(
      "empty leaderboard: pages should be 0",
      firstPagination.pages,
      0,
    );

    // Nothing more to validate in the empty dataset scenario.
    return;
  }

  // For non-empty leaderboards, there should be at least one page.
  TestValidator.predicate(
    "non-empty leaderboard: pages should be at least 1",
    firstPagination.pages >= 1,
  );

  // ---------------------------------------------
  // 3. Per-entry field presence and rank/ordering on first page
  // ---------------------------------------------
  // Ensure that every entry has non-null total_karma, post_karma, comment_karma and rank.
  for (const [index, row] of firstData.entries()) {
    TestValidator.predicate(
      `first page row #${index}: total_karma must be a finite number`,
      Number.isFinite(row.total_karma),
    );
    TestValidator.predicate(
      `first page row #${index}: post_karma must be a finite number`,
      Number.isFinite(row.post_karma),
    );
    TestValidator.predicate(
      `first page row #${index}: comment_karma must be a finite number`,
      Number.isFinite(row.comment_karma),
    );
    TestValidator.predicate(
      `first page row #${index}: rank must be a positive integer`,
      Number.isInteger(row.rank) && row.rank >= 1,
    );

    // member_user has already been asserted structurally by typia.assert,
    // but we can still check that an id is present for leaderboard semantics.
    TestValidator.predicate(
      `first page row #${index}: member_user id should be non-empty string`,
      typeof row.member_user.id === "string" && row.member_user.id.length > 0,
    );
  }

  // Verify ordering by total_karma (descending) and rank sequence within the page.
  for (let i = 0; i < firstData.length; i++) {
    const row = firstData[i];

    if (i === 0) {
      TestValidator.equals(
        "first page: first row should have rank 1",
        row.rank,
        1,
      );
    } else {
      const prev = firstData[i - 1];

      // Rank must increase by 1 across rows in the same page.
      TestValidator.equals(
        `first page: rank should be sequential between row ${i - 1} and ${i}`,
        row.rank,
        prev.rank + 1,
      );

      // total_karma must be non-increasing (descending order).
      TestValidator.predicate(
        `first page: total_karma should be non-increasing between row ${i - 1} and ${i}`,
        prev.total_karma >= row.total_karma,
      );
    }
  }

  // ---------------------------------------------
  // 4. Multi-page behavior: request second page if available
  // ---------------------------------------------
  if (firstPagination.records > pageSize && firstPagination.pages >= 2) {
    const secondPageRequestBody = {
      ...firstPageRequestBody,
      page: 2,
    } satisfies ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.IRequest;

    const secondPage: IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary =
      await api.functional.communityPlatform.votingKarma.statistics.topKarmaUsers.index(
        connection,
        {
          body: secondPageRequestBody,
        },
      );

    typia.assert<IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary>(
      secondPage,
    );

    const secondPagination = secondPage.pagination;
    const secondData = secondPage.data;

    // Basic second-page pagination metadata checks
    TestValidator.equals(
      "second page: limit should match requested pageSize",
      secondPagination.limit,
      pageSize,
    );

    TestValidator.equals(
      "second page: current index should be 2",
      secondPagination.current,
      2,
    );

    TestValidator.predicate(
      "second page: records should be >= number of returned rows",
      secondPagination.records >= (secondData?.length ?? 0),
    );

    if (secondData.length > 0 && firstData.length > 0) {
      const lastRankFirstPage = firstData[firstData.length - 1].rank;
      const firstRankSecondPage = secondData[0].rank;

      TestValidator.equals(
        "second page: rank should continue consecutively from first page",
        firstRankSecondPage,
        lastRankFirstPage + 1,
      );

      // Ensure no duplicated member_user ids between page 1 and page 2
      const firstPageUserIds = new Set(
        firstData.map((row) => row.member_user.id),
      );
      const duplicateOnSecondPage = secondData.some((row) =>
        firstPageUserIds.has(row.member_user.id),
      );

      TestValidator.predicate(
        "multi-page leaderboard: user ids should not be duplicated across pages",
        duplicateOnSecondPage === false,
      );
    }
  }
}
