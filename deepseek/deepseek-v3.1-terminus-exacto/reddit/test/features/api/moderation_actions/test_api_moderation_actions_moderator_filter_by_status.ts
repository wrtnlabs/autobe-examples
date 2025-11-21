import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

/**
 * Test moderation action filtering by status values including pending, active,
 * completed, appealed, overturned, and expired. Validates that moderators can
 * effectively monitor ongoing moderation activities and track workflow
 * progress. Tests search functionality with date range filters to support
 * moderation performance analysis and identify patterns in moderation
 * resolution timelines.
 */
export async function test_api_moderation_actions_moderator_filter_by_status(
  connection: api.IConnection,
) {
  // 1. Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      moderator_level: "global",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Test filtering by each status value
  const statusValues = [
    "pending",
    "active",
    "completed",
    "appealed",
    "overturned",
    "expired",
  ] as const;

  for (const status of statusValues) {
    // Test basic status filtering
    const filteredResults =
      await api.functional.communityPlatform.moderator.moderationActions.index(
        connection,
        {
          body: {
            status: status,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformModerationAction.IRequest,
        },
      );
    typia.assert(filteredResults);

    TestValidator.predicate(
      `pagination should be valid for ${status} status`,
      filteredResults.pagination.current >= 0 &&
        filteredResults.pagination.limit > 0 &&
        filteredResults.pagination.records >= 0 &&
        filteredResults.pagination.pages >= 0,
    );

    // Validate that all returned actions have the correct status (if any results)
    if (filteredResults.data.length > 0) {
      TestValidator.predicate(
        `all results should have ${status} status`,
        filteredResults.data.every((action) => action.status === status),
      );
    } else {
      // Log empty results for informational purposes
      console.log(`No moderation actions found with status: ${status}`);
    }
  }

  // 3. Test date range filtering with status
  const now = new Date();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneMonthAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Test date range with specific status
  const dateFilteredResults =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          status: "completed",
          created_after: oneMonthAgo,
          created_before: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(dateFilteredResults);

  // Validate date range if results are returned
  if (dateFilteredResults.data.length > 0) {
    TestValidator.predicate(
      "completed actions should be within date range",
      dateFilteredResults.data.every((action) => {
        const actionDate = new Date(action.created_at);
        const startDate = new Date(oneMonthAgo);
        const endDate = new Date(now.toISOString());
        return actionDate >= startDate && actionDate <= endDate;
      }),
    );
  }

  // 4. Test pagination with different limits
  const paginationTests = [5, 10, 25, 50];
  for (const limit of paginationTests) {
    const paginatedResults =
      await api.functional.communityPlatform.moderator.moderationActions.index(
        connection,
        {
          body: {
            status: "active",
            page: 1,
            limit: limit,
          } satisfies ICommunityPlatformModerationAction.IRequest,
        },
      );
    typia.assert(paginatedResults);

    TestValidator.equals(
      `page limit should match requested limit ${limit}`,
      paginatedResults.pagination.limit,
      limit,
    );

    TestValidator.predicate(
      `data length should not exceed limit ${limit}`,
      paginatedResults.data.length <= limit,
    );
  }

  // 5. Test combined filters with search term
  const searchFilteredResults =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          status: "pending",
          search: "test",
          created_after: oneWeekAgo,
          page: 1,
          limit: 15,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(searchFilteredResults);

  // Note: Search validation would require actual data with matching search terms
  // This test validates the API accepts the search parameter without errors

  // 6. Test empty filters (should return all moderation actions)
  const allResults =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(allResults);

  TestValidator.predicate(
    "pagination should be valid for unfiltered results",
    allResults.pagination.current >= 0 &&
      allResults.pagination.limit > 0 &&
      allResults.pagination.records >= 0 &&
      allResults.pagination.pages >= 0,
  );
}
