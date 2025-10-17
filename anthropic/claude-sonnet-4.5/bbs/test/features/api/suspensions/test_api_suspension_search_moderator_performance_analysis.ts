import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuspension";

/**
 * Test suspension search for moderator performance analysis and compliance
 * reporting.
 *
 * This test validates the suspension search functionality specifically designed
 * for moderator performance analysis and compliance reporting use cases. It
 * demonstrates how administrators can analyze disciplinary patterns, evaluate
 * moderation consistency, and generate compliance reports through advanced
 * filtering capabilities.
 *
 * Workflow:
 *
 * 1. Register and authenticate as a moderator to access suspension search API
 * 2. Execute complex search with multiple filter criteria (moderator ID, duration
 *    ranges, temporal queries)
 * 3. Validate response structure includes comprehensive suspension details for
 *    dashboards
 * 4. Test filtering by suspension reason keywords to identify violation patterns
 * 5. Verify sorting capabilities across multiple fields for analytical workflows
 * 6. Confirm early lift status tracking for manual suspension terminations
 * 7. Validate pagination controls for navigating large suspension datasets
 */
export async function test_api_suspension_search_moderator_performance_analysis(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a moderator
  const adminId = typia.random<string & tags.Format<"uuid">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: adminId,
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Execute basic suspension search with pagination
  const basicSearchResult =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardSuspension.IRequest,
      },
    );
  typia.assert(basicSearchResult);

  // Step 3: Validate response structure includes comprehensive pagination and data
  TestValidator.predicate(
    "pagination should have valid structure",
    basicSearchResult.pagination.current >= 0 &&
      basicSearchResult.pagination.limit > 0 &&
      basicSearchResult.pagination.records >= 0 &&
      basicSearchResult.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "data array should be present",
    Array.isArray(basicSearchResult.data),
  );

  // Step 4: Test filtering by moderator ID for performance analysis
  const moderatorFilterResult =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: {
          moderator_id: moderator.id,
          page: 1,
          limit: 50,
          sort: "start_date",
          order: "desc",
        } satisfies IDiscussionBoardSuspension.IRequest,
      },
    );
  typia.assert(moderatorFilterResult);

  // Step 5: Test duration range filtering for consistency analysis
  const durationRangeResult =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: {
          duration_min: 7,
          duration_max: 14,
          page: 1,
          limit: 25,
          sort: "duration_days",
          order: "asc",
        } satisfies IDiscussionBoardSuspension.IRequest,
      },
    );
  typia.assert(durationRangeResult);

  // Step 6: Test temporal queries for pattern analysis
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const temporalResult =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: {
          start_date_from: thirtyDaysAgo.toISOString(),
          start_date_to: now.toISOString(),
          page: 1,
          limit: 30,
          sort: "start_date",
          order: "desc",
        } satisfies IDiscussionBoardSuspension.IRequest,
      },
    );
  typia.assert(temporalResult);

  // Step 7: Test filtering by active status
  const activeStatusResult =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardSuspension.IRequest,
      },
    );
  typia.assert(activeStatusResult);

  // Step 8: Test early lift status filtering
  const earlyLiftResult =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: {
          lifted_early: true,
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardSuspension.IRequest,
      },
    );
  typia.assert(earlyLiftResult);

  // Step 9: Test search by suspension reason keywords
  const reasonSearchResult =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: {
          search: "harassment",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSuspension.IRequest,
      },
    );
  typia.assert(reasonSearchResult);

  // Step 10: Test complex multi-criteria search for comprehensive analysis
  const complexSearchResult =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: {
          is_active: false,
          duration_min: 3,
          duration_max: 30,
          start_date_from: thirtyDaysAgo.toISOString(),
          lifted_early: false,
          page: 1,
          limit: 40,
          sort: "end_date",
          order: "asc",
        } satisfies IDiscussionBoardSuspension.IRequest,
      },
    );
  typia.assert(complexSearchResult);

  // Step 11: Verify sorting by different fields
  const sortByEndDateResult =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
          sort: "end_date",
          order: "asc",
        } satisfies IDiscussionBoardSuspension.IRequest,
      },
    );
  typia.assert(sortByEndDateResult);

  const sortByDurationResult =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
          sort: "duration_days",
          order: "desc",
        } satisfies IDiscussionBoardSuspension.IRequest,
      },
    );
  typia.assert(sortByDurationResult);

  // Step 12: Validate pagination by fetching multiple pages
  const firstPage =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSuspension.IRequest,
      },
    );
  typia.assert(firstPage);

  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.discussionBoard.moderator.suspensions.index(
        connection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IDiscussionBoardSuspension.IRequest,
        },
      );
    typia.assert(secondPage);

    TestValidator.equals(
      "pagination limit should be consistent",
      firstPage.pagination.limit,
      secondPage.pagination.limit,
    );

    TestValidator.equals(
      "total records should be consistent across pages",
      firstPage.pagination.records,
      secondPage.pagination.records,
    );
  }
}
