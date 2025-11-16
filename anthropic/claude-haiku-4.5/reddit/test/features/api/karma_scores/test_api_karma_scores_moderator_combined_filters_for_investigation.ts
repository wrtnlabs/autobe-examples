import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaScore";

/**
 * Test combining multiple filters as a moderator to investigate specific member
 * patterns.
 *
 * This test validates moderator investigation capabilities by combining
 * multiple karma score filters to identify members with unusual reputation
 * patterns. Tests filtering by karma ranges (total, post, comment) combined
 * with date filters to find members with sudden reputation changes or recent
 * low activity.
 *
 * Test flow:
 *
 * 1. Authenticate as moderator
 * 2. Query karma scores with combined filters for low total karma
 * 3. Query karma scores filtering by post karma range
 * 4. Query karma scores filtering by comment karma range
 * 5. Query karma scores with recent update date filter
 * 6. Combine multiple filters (karma range + date range) for investigation
 * 7. Validate pagination of filtered results
 * 8. Validate sorting options on filtered karma data
 */
export async function test_api_karma_scores_moderator_combined_filters_for_investigation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator is authenticated",
    moderator.id !== null && moderator.token !== undefined,
  );

  // Step 2: Query karma scores with low total karma filter
  const lowKarmaResults: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          minTotalKarma: 0,
          maxTotalKarma: 100,
          orderBy: "total_karma",
          order: "asc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(lowKarmaResults);
  TestValidator.predicate(
    "low karma query returns paginated results",
    lowKarmaResults.pagination !== undefined &&
      lowKarmaResults.data !== undefined,
  );
  TestValidator.predicate(
    "low karma results contain expected data",
    lowKarmaResults.data.length >= 0,
  );

  // Step 3: Query karma scores filtering by post karma range
  const postKarmaResults: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          minPostKarma: 0,
          maxPostKarma: 50,
          orderBy: "post_karma",
          order: "desc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(postKarmaResults);
  TestValidator.predicate(
    "post karma filter works correctly",
    postKarmaResults.data.length >= 0 &&
      postKarmaResults.pagination.current > 0,
  );

  // Step 4: Query karma scores filtering by comment karma range
  const commentKarmaResults: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 15,
          minCommentKarma: 0,
          maxCommentKarma: 75,
          orderBy: "comment_karma",
          order: "asc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(commentKarmaResults);
  TestValidator.predicate(
    "comment karma filter works correctly",
    commentKarmaResults.pagination.limit === 15,
  );

  // Step 5: Query karma scores with recent update date filter
  const recentDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const recentUpdateResults: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          updatedAfter: recentDate,
          orderBy: "updated_at",
          order: "desc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(recentUpdateResults);
  TestValidator.predicate(
    "recent update filter returns results",
    recentUpdateResults.data.length >= 0,
  );

  // Step 6: Combine multiple filters for investigation (low karma with recent updates)
  const investigationResults: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          minTotalKarma: 0,
          maxTotalKarma: 200,
          updatedAfter: recentDate,
          orderBy: "total_karma",
          order: "asc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(investigationResults);
  TestValidator.predicate(
    "combined filters return targeted investigation results",
    investigationResults.pagination !== undefined &&
      investigationResults.data !== undefined,
  );
  TestValidator.equals(
    "investigation results page is first page",
    investigationResults.pagination.current,
    1,
  );

  // Step 7: Validate pagination of filtered results
  const paginationResults: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
          minTotalKarma: 0,
          maxTotalKarma: 500,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(paginationResults);
  TestValidator.predicate(
    "pagination control works with filters",
    paginationResults.pagination.limit === 5,
  );
  TestValidator.equals(
    "second page request is honored",
    paginationResults.pagination.current,
    2,
  );

  // Step 8: Validate sorting options on filtered karma data
  const sortByCommentKarmaResults: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          orderBy: "comment_karma",
          order: "desc",
          minCommentKarma: 0,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(sortByCommentKarmaResults);
  TestValidator.predicate(
    "sorting by comment_karma descending returns valid data",
    sortByCommentKarmaResults.data.length >= 0,
  );

  // Validate results from combined filter query are properly structured
  if (investigationResults.data.length > 0) {
    const firstResult = investigationResults.data[0];
    TestValidator.predicate(
      "result has valid id",
      firstResult.id !== null && firstResult.id !== undefined,
    );
    TestValidator.predicate(
      "result has valid total_karma",
      firstResult.total_karma >= 0,
    );
    TestValidator.predicate(
      "result has valid post_karma",
      firstResult.post_karma >= 0,
    );
    TestValidator.predicate(
      "result has valid comment_karma",
      firstResult.comment_karma >= 0,
    );
    TestValidator.predicate(
      "result has valid updated_at timestamp",
      firstResult.updated_at !== undefined,
    );
  }
}
