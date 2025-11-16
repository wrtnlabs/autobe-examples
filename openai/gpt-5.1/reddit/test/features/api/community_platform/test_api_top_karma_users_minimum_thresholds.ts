import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers";

export async function test_api_top_karma_users_minimum_thresholds(
  connection: api.IConnection,
) {
  // 1. Baseline call without minimum thresholds
  const baselineRequestBody = {
    timeWindow: "allTime" as const,
    customFrom: undefined,
    customTo: undefined,
    communityIds: undefined,
    minTotalKarma: null,
    minPostKarma: null,
    minCommentKarma: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: "totalKarma" as const,
    sortDirection: "desc" as const,
  } satisfies ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.IRequest;

  const baselinePage =
    await api.functional.communityPlatform.votingKarma.statistics.topKarmaUsers.index(
      connection,
      {
        body: baselineRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary>(
    baselinePage,
  );

  const baselinePagination = baselinePage.pagination;
  const baselineData = baselinePage.data;

  // Basic pagination invariants
  TestValidator.predicate(
    "baseline page current >= 0",
    baselinePagination.current >= 0,
  );
  TestValidator.predicate(
    "baseline page limit >= 0",
    baselinePagination.limit >= 0,
  );
  TestValidator.predicate(
    "baseline records non-negative",
    baselinePagination.records >= 0,
  );
  TestValidator.predicate(
    "baseline pages non-negative",
    baselinePagination.pages >= 0,
  );

  if (baselineData.length === 0) {
    // If there is no data at all, we cannot meaningfully test thresholds.
    TestValidator.equals(
      "baseline empty implies records is 0",
      baselinePagination.records,
      0,
    );
    return;
  }

  // 2. Derive a total_karma threshold from baseline and call with minTotalKarma
  if (baselineData.length >= 2) {
    // Copy and sort baseline by total_karma ascending
    const sortedByTotal = [...baselineData].sort(
      (a, b) => a.total_karma - b.total_karma,
    );
    const midIndex = Math.floor(sortedByTotal.length / 2);
    const totalThreshold = sortedByTotal[midIndex].total_karma;

    const minTotalRequestBody = {
      ...baselineRequestBody,
      minTotalKarma: totalThreshold,
      minPostKarma: null,
      minCommentKarma: null,
    } satisfies ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.IRequest;

    const minTotalPage =
      await api.functional.communityPlatform.votingKarma.statistics.topKarmaUsers.index(
        connection,
        { body: minTotalRequestBody },
      );
    typia.assert<IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary>(
      minTotalPage,
    );

    const minTotalData = minTotalPage.data;

    // Every entry must meet the minTotalKarma threshold
    for (const row of minTotalData) {
      TestValidator.predicate(
        "row.total_karma >= minTotalKarma",
        row.total_karma >= totalThreshold,
      );
    }

    // If there were any users below the threshold in baseline and
    // minTotalData is non-empty, expect some of those low users to be absent.
    const belowThresholdBaseline = baselineData.filter(
      (row) => row.total_karma < totalThreshold,
    );
    if (belowThresholdBaseline.length > 0 && minTotalData.length > 0) {
      const baselineLowIds = new Set(
        belowThresholdBaseline.map((row) => row.member_user.id),
      );
      const minTotalIds = new Set(
        minTotalData.map((row) => row.member_user.id),
      );
      const someLowMissing = Array.from(baselineLowIds).some(
        (id) => !minTotalIds.has(id),
      );
      TestValidator.predicate(
        "some low-total-karma users are filtered out",
        someLowMissing,
      );
    }
  }

  // 3. minPostKarma-only scenario
  if (baselineData.length >= 2) {
    const sortedByPost = [...baselineData].sort(
      (a, b) => a.post_karma - b.post_karma,
    );
    const postMidIndex = Math.floor(sortedByPost.length / 2);
    const postThreshold = sortedByPost[postMidIndex].post_karma;

    const minPostRequestBody = {
      ...baselineRequestBody,
      minTotalKarma: null,
      minPostKarma: postThreshold,
      minCommentKarma: null,
    } satisfies ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.IRequest;

    const minPostPage =
      await api.functional.communityPlatform.votingKarma.statistics.topKarmaUsers.index(
        connection,
        { body: minPostRequestBody },
      );
    typia.assert<IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary>(
      minPostPage,
    );

    const minPostData = minPostPage.data;

    for (const row of minPostData) {
      TestValidator.predicate(
        "row.post_karma >= minPostKarma",
        row.post_karma >= postThreshold,
      );
    }

    const belowPostBaseline = baselineData.filter(
      (row) => row.post_karma < postThreshold,
    );
    if (belowPostBaseline.length > 0 && minPostData.length > 0) {
      const lowPostIds = new Set(
        belowPostBaseline.map((row) => row.member_user.id),
      );
      const minPostIds = new Set(minPostData.map((row) => row.member_user.id));
      const someLowPostMissing = Array.from(lowPostIds).some(
        (id) => !minPostIds.has(id),
      );
      TestValidator.predicate(
        "some low-post-karma users are filtered out",
        someLowPostMissing,
      );
    }
  }

  // 4. Combined minPostKarma and minCommentKarma scenario
  if (baselineData.length >= 3) {
    const sortedByPost = [...baselineData].sort(
      (a, b) => a.post_karma - b.post_karma,
    );
    const sortedByComment = [...baselineData].sort(
      (a, b) => a.comment_karma - b.comment_karma,
    );

    const postThreshold =
      sortedByPost[Math.floor(sortedByPost.length / 2)].post_karma;
    const commentThreshold =
      sortedByComment[Math.floor(sortedByComment.length / 2)].comment_karma;

    const combinedRequestBody = {
      ...baselineRequestBody,
      minTotalKarma: null,
      minPostKarma: postThreshold,
      minCommentKarma: commentThreshold,
    } satisfies ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.IRequest;

    const combinedPage =
      await api.functional.communityPlatform.votingKarma.statistics.topKarmaUsers.index(
        connection,
        { body: combinedRequestBody },
      );
    typia.assert<IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary>(
      combinedPage,
    );

    const combinedData = combinedPage.data;

    for (const row of combinedData) {
      TestValidator.predicate(
        "row.post_karma >= combined minPostKarma",
        row.post_karma >= postThreshold,
      );
      TestValidator.predicate(
        "row.comment_karma >= combined minCommentKarma",
        row.comment_karma >= commentThreshold,
      );
    }

    const violatingBaseline = baselineData.filter(
      (row) =>
        row.post_karma < postThreshold || row.comment_karma < commentThreshold,
    );
    if (violatingBaseline.length > 0 && combinedData.length > 0) {
      const violatingIds = new Set(
        violatingBaseline.map((row) => row.member_user.id),
      );
      const combinedIds = new Set(
        combinedData.map((row) => row.member_user.id),
      );
      const someViolatingMissing = Array.from(violatingIds).some(
        (id) => !combinedIds.has(id),
      );
      TestValidator.predicate(
        "some users violating combined thresholds are filtered out",
        someViolatingMissing,
      );
    }
  }
}
