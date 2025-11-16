import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers";

export async function test_api_top_karma_users_time_window_filtering(
  connection: api.IConnection,
) {
  // 1. Prepare a stable, reasonable request template shared across calls.
  const baseRequest = {
    communityIds: undefined,
    minTotalKarma: null,
    minPostKarma: null,
    minCommentKarma: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: "totalKarma" as "totalKarma",
    sortDirection: "desc" as "desc",
  } satisfies Omit<
    ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.IRequest,
    "timeWindow" | "customFrom" | "customTo"
  >;

  // Helper to build full request bodies for different time windows.
  const buildRequest = (
    timeWindow: "allTime" | "last7Days" | "last30Days" | "custom",
    customFrom?: string & tags.Format<"date-time">,
    customTo?: string & tags.Format<"date-time">,
  ): ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.IRequest => {
    return {
      ...baseRequest,
      timeWindow,
      customFrom,
      customTo,
    } satisfies ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.IRequest;
  };

  // 2. Build concrete windowed requests.
  const last7DaysRequest = buildRequest("last7Days");
  const last30DaysRequest = buildRequest("last30Days");

  // Custom window: choose a subset of the last 30 days.
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;

  const customToDate = new Date(now.getTime() - 3 * msPerDay);
  const customFromDate = new Date(now.getTime() - 10 * msPerDay);

  const customRequest = buildRequest(
    "custom",
    customFromDate.toISOString() as string & tags.Format<"date-time">,
    customToDate.toISOString() as string & tags.Format<"date-time">,
  );

  // 3. Execute the three calls.
  const last7DaysPage: IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary =
    await api.functional.communityPlatform.votingKarma.statistics.topKarmaUsers.index(
      connection,
      { body: last7DaysRequest },
    );
  typia.assert<IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary>(
    last7DaysPage,
  );

  const last30DaysPage: IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary =
    await api.functional.communityPlatform.votingKarma.statistics.topKarmaUsers.index(
      connection,
      { body: last30DaysRequest },
    );
  typia.assert<IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary>(
    last30DaysPage,
  );

  const customPage: IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary =
    await api.functional.communityPlatform.votingKarma.statistics.topKarmaUsers.index(
      connection,
      { body: customRequest },
    );
  typia.assert<IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary>(
    customPage,
  );

  // 4. Common pagination invariants for a page response.
  const assertPagination = (title: string, page: IPage.IPagination): void => {
    TestValidator.predicate(
      `${title} - current page non-negative`,
      page.current >= 0,
    );
    TestValidator.predicate(`${title} - limit non-negative`, page.limit >= 0);
    TestValidator.predicate(
      `${title} - records non-negative`,
      page.records >= 0,
    );
    TestValidator.predicate(`${title} - pages non-negative`, page.pages >= 0);
    if (page.records === 0 || page.limit === 0) {
      TestValidator.equals(
        `${title} - zero records or limit implies zero pages`,
        page.pages,
        0,
      );
    } else {
      TestValidator.predicate(
        `${title} - positive records and limit implies at least one page`,
        page.pages >= 1,
      );
    }
  };

  // 5. Sorting and rank consistency for a top karma result page.
  const assertOrdering = (
    title: string,
    page: IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary,
  ): void => {
    const { data } = page;
    if (data.length === 0) return;

    for (let i = 0; i < data.length - 1; i++) {
      const current = data[i];
      const next = data[i + 1];
      TestValidator.predicate(
        `${title} - non-increasing total_karma at index ${i}`,
        current.total_karma >= next.total_karma,
      );
      TestValidator.predicate(
        `${title} - rank strictly increasing at index ${i}`,
        current.rank < next.rank,
      );
    }

    const firstRank = data[0]?.rank;
    if (firstRank !== undefined) {
      TestValidator.predicate(
        `${title} - first rank should be >= 1`,
        firstRank >= 1,
      );
    }
  };

  // 6. Validate basic invariants for each response.
  assertPagination("last7Days", last7DaysPage.pagination);
  assertOrdering("last7Days", last7DaysPage);

  assertPagination("last30Days", last30DaysPage.pagination);
  assertOrdering("last30Days", last30DaysPage);

  assertPagination("custom", customPage.pagination);
  assertOrdering("custom", customPage);

  // 7. Build quick lookup maps by member_user.id for cross-window comparisons.
  const buildKarmaMap = (
    page: IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary,
  ): Map<
    string & tags.Format<"uuid">,
    ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary
  > => {
    const map = new Map<
      string & tags.Format<"uuid">,
      ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary
    >();
    for (const row of page.data) {
      const id = row.member_user.id;
      map.set(id, row);
    }
    return map;
  };

  const map7 = buildKarmaMap(last7DaysPage);
  const map30 = buildKarmaMap(last30DaysPage);
  const mapCustom = buildKarmaMap(customPage);

  // 8. Monotonicity check: last30Days totals should be >= last7Days for overlapping users.
  for (const [memberId, sevenRow] of map7.entries()) {
    const thirtyRow = map30.get(memberId);
    if (!thirtyRow) continue;

    TestValidator.predicate(
      "30-day total_karma should be >= 7-day total_karma for overlapping user",
      thirtyRow.total_karma >= sevenRow.total_karma,
    );
  }

  // 9. Monotonicity check: custom window totals should be <= last30Days for overlapping users.
  for (const [memberId, customRow] of mapCustom.entries()) {
    const thirtyRow = map30.get(memberId);
    if (!thirtyRow) continue;

    TestValidator.predicate(
      "custom-window total_karma should be <= 30-day total_karma for overlapping user",
      customRow.total_karma <= thirtyRow.total_karma,
    );
  }
}
