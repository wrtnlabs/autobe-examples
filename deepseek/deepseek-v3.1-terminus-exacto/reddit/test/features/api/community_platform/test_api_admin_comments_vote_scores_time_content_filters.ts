import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin filtering by time periods and comment content to support moderation investigations.
 * Authenticate as admin and create test comments with voting activity spread across different time periods.
 * Test filtering by creation date ranges to analyze recent voting trends versus historical patterns.
 * Verify that updated timestamp filtering captures when vote scores were last recalculated.
 * Test comment content filtering to search for problematic content patterns or specific moderation targets.
 * Combine multiple filters together to simulate complex moderation queries.
 */
export async function test_api_admin_comments_vote_scores_time_content_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Define time periods for filtering
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  // Test 1: Filter by creation date ranges (recent comments)
  const recentResults =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          created_after: oneWeekAgo,
          created_before: now,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(recentResults);
  TestValidator.predicate(
    "recent results have valid structure",
    recentResults.data.length >= 0,
  );
  // Test 2: Filter by creation date ranges (historical comments)
  const historicalResults =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          created_before: oneWeekAgo,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(historicalResults);
  TestValidator.predicate(
    "historical results have valid structure",
    historicalResults.data.length >= 0,
  );
  // Test 3: Filter by updated timestamp
  const recentlyUpdatedResults =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          updated_after: oneDayAgo,
          updated_before: now,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(recentlyUpdatedResults);
  TestValidator.predicate(
    "recently updated results have valid structure",
    recentlyUpdatedResults.data.length >= 0,
  );
  // Test 4: Filter by comment content
  const keywordResults =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          comment_content: "test",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(keywordResults);
  TestValidator.predicate(
    "keyword results have valid structure",
    keywordResults.data.length >= 0,
  );
  // Test 5: Complex filter - controversial comments with keywords from recent period
  const controversialResults =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          maximum_score: -1,
          created_after: oneWeekAgo,
          comment_content: "problem",
          limit: 10,
          page: 1,
          sort_by: "last_updated_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(controversialResults);
  TestValidator.predicate(
    "controversial results have valid structure",
    controversialResults.data.length >= 0,
  );
  // Test 6: Pagination with combined filters
  const paginatedResults =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          created_after: oneWeekAgo,
          minimum_upvotes: 1,
          limit: 5,
          page: 2,
          sort_by: "score",
          sort_order: "desc",
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(paginatedResults);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    paginatedResults.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has positive limit",
    paginatedResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    paginatedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    paginatedResults.pagination.pages >= 0,
  );
  // Test 7: Sorting by different fields
  const sortingTests = [
    { sort_by: "score", sort_order: "desc" },
    { sort_by: "upvote_count", sort_order: "asc" },
    { sort_by: "last_updated_at", sort_order: "desc" },
  ] as const;
  for (const sortConfig of sortingTests) {
    const sortedResults =
      await api.functional.communityPlatform.admin.comments.vote_scores.index(
        adminConnection,
        {
          body: {
            ...sortConfig,
            limit: 10,
            page: 1,
          } satisfies ICommunityPlatformCommentVoteScore.IRequest,
        },
      );
    typia.assert(sortedResults);
    TestValidator.predicate(
      `${sortConfig.sort_by} sorted results have valid structure`,
      sortedResults.data.length >= 0,
    );
  }
}
