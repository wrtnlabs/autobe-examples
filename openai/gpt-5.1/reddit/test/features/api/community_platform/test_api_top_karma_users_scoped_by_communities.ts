import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers";

export async function test_api_top_karma_users_scoped_by_communities(
  connection: api.IConnection,
) {
  // 1. Prepare a deterministic base request for the global leaderboard (no communityIds)
  const baseRequestBody = {
    timeWindow: "allTime",
    page: 1,
    pageSize: 20,
    sortBy: "totalKarma" as const,
    sortDirection: "desc" as const,
  } satisfies ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.IRequest;

  const globalPage: IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary =
    await api.functional.communityPlatform.votingKarma.statistics.topKarmaUsers.index(
      connection,
      {
        body: baseRequestBody,
      },
    );

  // Validate type of the global response
  typia.assert<IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary>(
    globalPage,
  );

  // Basic pagination invariants for global leaderboard
  TestValidator.equals(
    "global pagination current page should equal requested page",
    globalPage.pagination.current,
    baseRequestBody.page,
  );
  TestValidator.equals(
    "global pagination limit should equal requested pageSize",
    globalPage.pagination.limit,
    baseRequestBody.pageSize,
  );
  await TestValidator.predicate(
    "global records should be non-negative and not less than data length",
    async () =>
      globalPage.pagination.records >= 0 &&
      globalPage.pagination.records >= globalPage.data.length,
  );
  await TestValidator.predicate(
    "global pages should be non-negative",
    async () => globalPage.pagination.pages >= 0,
  );
  await TestValidator.predicate(
    "global data length should not exceed pageSize",
    async () => globalPage.data.length <= baseRequestBody.pageSize,
  );

  // Helper to verify descending sort by total_karma
  const assertDescendingByTotalKarma = async (
    title: string,
    items: ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary[],
  ): Promise<void> => {
    if (items.length <= 1) return;

    await TestValidator.predicate(title, async () => {
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1];
        const curr = items[i];
        if (prev.total_karma < curr.total_karma) return false;
      }
      return true;
    });
  };

  await assertDescendingByTotalKarma(
    "global leaderboard should be sorted by total_karma desc",
    globalPage.data,
  );

  // 2. Build a second request with communityIds scoped (non-empty array)
  const communityIds: string[] = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];

  const scopedRequestBody = {
    ...baseRequestBody,
    communityIds,
  } satisfies ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.IRequest;

  const scopedPage: IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary =
    await api.functional.communityPlatform.votingKarma.statistics.topKarmaUsers.index(
      connection,
      {
        body: scopedRequestBody,
      },
    );

  // Validate type of the scoped response
  typia.assert<IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary>(
    scopedPage,
  );

  // Pagination invariants for scoped leaderboard
  TestValidator.equals(
    "scoped pagination current page should equal requested page",
    scopedPage.pagination.current,
    scopedRequestBody.page,
  );
  TestValidator.equals(
    "scoped pagination limit should equal requested pageSize",
    scopedPage.pagination.limit,
    scopedRequestBody.pageSize,
  );
  await TestValidator.predicate(
    "scoped records should be non-negative and not less than data length",
    async () =>
      scopedPage.pagination.records >= 0 &&
      scopedPage.pagination.records >= scopedPage.data.length,
  );
  await TestValidator.predicate(
    "scoped pages should be non-negative",
    async () => scopedPage.pagination.pages >= 0,
  );
  await TestValidator.predicate(
    "scoped data length should not exceed pageSize",
    async () => scopedPage.data.length <= scopedRequestBody.pageSize,
  );

  await assertDescendingByTotalKarma(
    "scoped leaderboard should be sorted by total_karma desc",
    scopedPage.data,
  );

  // 3. Optional consistency checks between global and scoped responses
  // We do not enforce that the data must differ, but if both have records,
  // we can at least assert that their pagination configuration is identical.
  if (globalPage.pagination.records > 0 && scopedPage.pagination.records > 0) {
    TestValidator.equals(
      "global and scoped page size configuration should match",
      globalPage.pagination.limit,
      scopedPage.pagination.limit,
    );
    TestValidator.equals(
      "global and scoped current page configuration should match",
      globalPage.pagination.current,
      scopedPage.pagination.current,
    );
  }
}
