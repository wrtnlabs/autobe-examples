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
 * Test vote scores filtering by calculation timestamps.
 *
 * Validates that administrators can filter vote scores using calculated_after
 * and calculated_before parameters to retrieve records within specific time
 * periods. Tests date-based filtering to ensure accurate temporal analysis of
 * vote score patterns.
 *
 * Implementation Steps:
 *
 * 1. Authenticate as administrator to establish admin privileges
 * 2. Test filtering with calculated_after parameter
 * 3. Test filtering with calculated_before parameter
 * 4. Test combined filtering with both parameters for date range queries
 * 5. Validate that filtered results contain only scores within specified time
 *    ranges
 */
export async function test_api_vote_scores_temporal_filtering(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test filtering with calculated_after parameter
  const currentTime = new Date().toISOString();
  const pastTime = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

  // Test calculated_after with past timestamp
  const scoresAfterPast: IPageICommunityPlatformVoteScore.ISummary =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        calculated_after: pastTime,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(scoresAfterPast);

  // Validate that all returned scores were calculated after the specified time
  TestValidator.predicate(
    "scores after past time should have valid calculation timestamps",
    scoresAfterPast.data.every((score) => score.calculated_at >= pastTime),
  );

  // Step 3: Test filtering with calculated_before parameter
  const scoresBeforeCurrent: IPageICommunityPlatformVoteScore.ISummary =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        calculated_before: currentTime,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(scoresBeforeCurrent);

  // Validate that all returned scores were calculated before the specified time
  TestValidator.predicate(
    "scores before current time should have valid calculation timestamps",
    scoresBeforeCurrent.data.every(
      (score) => score.calculated_at <= currentTime,
    ),
  );

  // Step 4: Test combined filtering with both parameters
  const scoresInRange: IPageICommunityPlatformVoteScore.ISummary =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        calculated_after: pastTime,
        calculated_before: currentTime,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(scoresInRange);

  // Validate that all returned scores are within the specified time range
  TestValidator.predicate(
    "scores in range should have calculation timestamps within specified bounds",
    scoresInRange.data.every(
      (score) =>
        score.calculated_at >= pastTime && score.calculated_at <= currentTime,
    ),
  );

  // Step 5: Test edge case with future timestamp (should return empty results)
  const futureTime = new Date(Date.now() + 86400000).toISOString(); // 1 day in future
  const scoresAfterFuture: IPageICommunityPlatformVoteScore.ISummary =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        calculated_after: futureTime,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(scoresAfterFuture);

  // Future timestamp should return empty results since no scores exist in the future
  TestValidator.equals(
    "future calculated_after should return empty results",
    scoresAfterFuture.data.length,
    0,
  );

  // Step 6: Test with content type filtering combined with temporal filtering
  const postScoresInRange: IPageICommunityPlatformVoteScore.ISummary =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        content_type: "post",
        calculated_after: pastTime,
        calculated_before: currentTime,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(postScoresInRange);

  // Validate content type and temporal filtering
  TestValidator.predicate(
    "post scores in range should have correct content type and timestamps",
    postScoresInRange.data.every(
      (score) =>
        score.content_type === "post" &&
        score.calculated_at >= pastTime &&
        score.calculated_at <= currentTime,
    ),
  );

  // Step 7: Test sorting by calculated_at with temporal filtering
  const sortedScores: IPageICommunityPlatformVoteScore.ISummary =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        calculated_after: pastTime,
        calculated_before: currentTime,
        sort_by: "calculated_at",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(sortedScores);

  // Validate that scores are sorted in descending order by calculated_at
  if (sortedScores.data.length > 1) {
    for (let i = 0; i < sortedScores.data.length - 1; i++) {
      TestValidator.predicate(
        `scores should be sorted in descending order by calculated_at (position ${i})`,
        sortedScores.data[i].calculated_at >=
          sortedScores.data[i + 1].calculated_at,
      );
    }
  }
}
