import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers";

/**
 * Validate that the top karma users statistics endpoint correctly applies
 * sorting across different karma dimensions and directions.
 *
 * Business goal: operator dashboards must be able to re-rank member users by
 * total, post-only, or comment-only karma, in both descending (leaderboard) and
 * ascending (analytics) modes, while preserving a consistent pagination/filter
 * contract.
 *
 * Scenario:
 *
 * 1. Use a stable filter (timeWindow "allTime", first page, fixed pageSize) to
 *    retrieve a page of ranked users.
 * 2. Request results sorted by totalKarma in descending order and assert that
 *    total_karma is non-increasing across the page.
 * 3. Request results sorted by postKarma in descending order and assert that
 *    post_karma is non-increasing. When both users appear in the totalKarma
 *    list, ensure that relative ordering differences are consistent with
 *    post_karma values.
 * 4. Request results sorted by commentKarma in descending order and assert that
 *    comment_karma is non-increasing.
 * 5. Request results sorted by commentKarma in ascending order and assert that
 *    comment_karma is non-decreasing. When asc/desc pages contain the same user
 *    set, perform light boundary consistency checks between the two orderings.
 */
export async function test_api_top_karma_users_sorting_variants(
  connection: api.IConnection,
) {
  const buildRequest = (
    sortBy: ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.IRequest["sortBy"],
    sortDirection: ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.IRequest["sortDirection"],
  ): ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.IRequest => ({
    timeWindow: "allTime",
    page: 1,
    pageSize: 50,
    sortBy,
    sortDirection,
    communityIds: undefined,
    minTotalKarma: null,
    minPostKarma: null,
    minCommentKarma: null,
    customFrom: undefined,
    customTo: undefined,
  });

  // 1. totalKarma desc
  const totalDesc: IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary =
    await api.functional.communityPlatform.votingKarma.statistics.topKarmaUsers.index(
      connection,
      {
        body: buildRequest("totalKarma", "desc"),
      },
    );
  typia.assert<IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary>(
    totalDesc,
  );

  const totalDescData = totalDesc.data;

  TestValidator.predicate(
    "totalKarma desc: non-increasing total_karma sequence",
    () => {
      for (let i = 1; i < totalDescData.length; ++i) {
        if (totalDescData[i - 1].total_karma < totalDescData[i].total_karma)
          return false;
      }
      return true;
    },
  );

  // 2. postKarma desc
  const postDesc: IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary =
    await api.functional.communityPlatform.votingKarma.statistics.topKarmaUsers.index(
      connection,
      {
        body: buildRequest("postKarma", "desc"),
      },
    );
  typia.assert<IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary>(
    postDesc,
  );

  const postDescData = postDesc.data;

  TestValidator.predicate(
    "postKarma desc: non-increasing post_karma sequence",
    () => {
      for (let i = 1; i < postDescData.length; ++i) {
        if (postDescData[i - 1].post_karma < postDescData[i].post_karma)
          return false;
      }
      return true;
    },
  );

  // Cross-compare ordering by member_user.id between total and post variants
  const idToRankByTotal = new Map<
    ICommunityPlatformMemberuser.ISummary["id"],
    number
  >();
  totalDescData.forEach((entry, index) => {
    idToRankByTotal.set(entry.member_user.id, index);
  });

  TestValidator.predicate(
    "postKarma vs totalKarma: relative ranks consistent with post_karma",
    () => {
      for (let i = 0; i < postDescData.length; ++i) {
        const lhs = postDescData[i];
        for (let j = i + 1; j < postDescData.length; ++j) {
          const rhs = postDescData[j];
          if (lhs.post_karma > rhs.post_karma) {
            const lhsTotalRank = idToRankByTotal.get(lhs.member_user.id);
            const rhsTotalRank = idToRankByTotal.get(rhs.member_user.id);
            if (
              lhsTotalRank !== undefined &&
              rhsTotalRank !== undefined &&
              lhsTotalRank > rhsTotalRank
            )
              return false;
          }
        }
      }
      return true;
    },
  );

  // 3. commentKarma desc
  const commentDesc: IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary =
    await api.functional.communityPlatform.votingKarma.statistics.topKarmaUsers.index(
      connection,
      {
        body: buildRequest("commentKarma", "desc"),
      },
    );
  typia.assert<IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary>(
    commentDesc,
  );

  const commentDescData = commentDesc.data;

  TestValidator.predicate(
    "commentKarma desc: non-increasing comment_karma sequence",
    () => {
      for (let i = 1; i < commentDescData.length; ++i) {
        if (
          commentDescData[i - 1].comment_karma <
          commentDescData[i].comment_karma
        )
          return false;
      }
      return true;
    },
  );

  // 4. commentKarma asc
  const commentAsc: IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary =
    await api.functional.communityPlatform.votingKarma.statistics.topKarmaUsers.index(
      connection,
      {
        body: buildRequest("commentKarma", "asc"),
      },
    );
  typia.assert<IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary>(
    commentAsc,
  );

  const commentAscData = commentAsc.data;

  TestValidator.predicate(
    "commentKarma asc: non-decreasing comment_karma sequence",
    () => {
      for (let i = 1; i < commentAscData.length; ++i) {
        if (
          commentAscData[i - 1].comment_karma > commentAscData[i].comment_karma
        )
          return false;
      }
      return true;
    },
  );

  // When asc/desc pages contain the same users, perform light boundary
  // consistency checks between the two orderings.
  if (commentAscData.length === commentDescData.length) {
    TestValidator.predicate(
      "commentKarma asc/desc: identical member_user.id sets when lengths match",
      () => {
        const ascIds = new Set(commentAscData.map((e) => e.member_user.id));
        const descIds = new Set(commentDescData.map((e) => e.member_user.id));
        if (ascIds.size !== descIds.size) return false;
        for (const id of ascIds) if (!descIds.has(id)) return false;
        return true;
      },
    );

    if (commentAscData.length > 0) {
      TestValidator.predicate(
        "commentKarma asc vs desc: boundary comment_karma values align",
        () => {
          const firstAsc = commentAscData[0]?.comment_karma;
          const lastAsc =
            commentAscData[commentAscData.length - 1]?.comment_karma;
          const firstDesc = commentDescData[0]?.comment_karma;
          const lastDesc =
            commentDescData[commentDescData.length - 1]?.comment_karma;

          if (
            firstAsc === undefined ||
            lastAsc === undefined ||
            firstDesc === undefined ||
            lastDesc === undefined
          )
            return true;

          return firstAsc <= lastAsc && firstDesc >= lastDesc;
        },
      );
    }
  }
}
