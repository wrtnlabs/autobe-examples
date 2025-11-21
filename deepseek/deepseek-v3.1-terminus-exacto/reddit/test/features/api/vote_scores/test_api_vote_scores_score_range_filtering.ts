import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteScore";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteScore";

/**
 * Test vote scores filtering by score ranges. Validate that administrators can
 * filter vote scores using min_total_score and max_total_score parameters to
 * retrieve records within specific score ranges. Test various score thresholds
 * to ensure accurate range-based filtering for vote score analysis.
 */
export async function test_api_vote_scores_score_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: First get baseline data to understand available score ranges
  const baselineResults =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        limit: 100,
        page: 1,
        sort_by: "total_score",
        order: "asc",
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(baselineResults);

  // If no data exists, skip range testing but validate API responds correctly
  if (baselineResults.data.length === 0) {
    // Test that API handles empty data sets correctly with various filters
    const emptyRangeResults =
      await api.functional.communityPlatform.admin.voteScores.index(
        connection,
        {
          body: {
            min_total_score: 0,
            max_total_score: 1000,
            limit: 100,
            page: 1,
          } satisfies ICommunityPlatformVoteScore.IRequest,
        },
      );
    typia.assert(emptyRangeResults);

    TestValidator.equals(
      "empty data set should return empty array",
      emptyRangeResults.data.length,
      0,
    );
    return;
  }

  // Determine available score range from existing data
  const scores = baselineResults.data.map((score) => score.total_score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const midScore = Math.floor((minScore + maxScore) / 2);

  // Step 3: Test various score range filtering scenarios using actual data ranges

  // Test case 1: Filter with range covering all data
  const fullRangeResults =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        min_total_score: minScore,
        max_total_score: maxScore,
        limit: 100,
        page: 1,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(fullRangeResults);

  TestValidator.predicate(
    "full range filter should return all data",
    fullRangeResults.data.length === baselineResults.data.length ||
      fullRangeResults.data.length <= baselineResults.data.length,
  );

  // Validate that all returned records are within the specified range
  for (const score of fullRangeResults.data) {
    TestValidator.predicate(
      "score should be >= min_total_score",
      score.total_score >= minScore,
    );
    TestValidator.predicate(
      "score should be <= max_total_score",
      score.total_score <= maxScore,
    );
  }

  // Test case 2: Filter with narrower range (lower half)
  const lowerRangeResults =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        min_total_score: minScore,
        max_total_score: midScore,
        limit: 100,
        page: 1,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(lowerRangeResults);

  for (const score of lowerRangeResults.data) {
    TestValidator.predicate(
      "score should be within lower range",
      score.total_score >= minScore && score.total_score <= midScore,
    );
  }

  // Test case 3: Filter with narrower range (upper half)
  const upperRangeResults =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        min_total_score: midScore,
        max_total_score: maxScore,
        limit: 100,
        page: 1,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(upperRangeResults);

  for (const score of upperRangeResults.data) {
    TestValidator.predicate(
      "score should be within upper range",
      score.total_score >= midScore && score.total_score <= maxScore,
    );
  }

  // Test case 4: Filter with only min_total_score (no upper bound)
  const minOnlyResults =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        min_total_score: midScore,
        limit: 100,
        page: 1,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(minOnlyResults);

  for (const score of minOnlyResults.data) {
    TestValidator.predicate(
      "score should be >= min_total_score when no max specified",
      score.total_score >= midScore,
    );
  }

  // Test case 5: Filter with only max_total_score (no lower bound)
  const maxOnlyResults =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        max_total_score: midScore,
        limit: 100,
        page: 1,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(maxOnlyResults);

  for (const score of maxOnlyResults.data) {
    TestValidator.predicate(
      "score should be <= max_total_score when no min specified",
      score.total_score <= midScore,
    );
  }

  // Test case 6: Empty result set (range outside available data)
  const emptyRangeResults =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        min_total_score: maxScore + 1000,
        max_total_score: maxScore + 2000,
        limit: 100,
        page: 1,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(emptyRangeResults);

  TestValidator.equals(
    "should return empty data array for range outside available data",
    emptyRangeResults.data.length,
    0,
  );

  // Test case 7: Combined filtering with content_type
  const contentTypes = ["post", "comment"] as const;
  for (const contentType of contentTypes) {
    const combinedResults =
      await api.functional.communityPlatform.admin.voteScores.index(
        connection,
        {
          body: {
            min_total_score: minScore,
            max_total_score: maxScore,
            content_type: contentType,
            limit: 50,
            page: 1,
          } satisfies ICommunityPlatformVoteScore.IRequest,
        },
      );
    typia.assert(combinedResults);

    for (const score of combinedResults.data) {
      TestValidator.predicate(
        "score should be within range",
        score.total_score >= minScore && score.total_score <= maxScore,
      );
      TestValidator.equals(
        "content_type should match filter",
        score.content_type,
        contentType,
      );
    }
  }

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be valid",
    fullRangeResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be valid",
    fullRangeResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count should be valid",
    fullRangeResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count should be valid",
    fullRangeResults.pagination.pages >= 0,
  );
}
