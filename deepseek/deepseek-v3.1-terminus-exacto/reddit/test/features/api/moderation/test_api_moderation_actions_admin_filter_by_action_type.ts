import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

/**
 * Test moderation action filtering by specific action types such as
 * content_removal, user_warning, temporary_ban, etc. Validates that
 * administrators can isolate specific moderation workflows and analyze patterns
 * across different action categories. Tests search functionality with combined
 * criteria including date ranges and status filters to ensure accurate result
 * filtering for moderation analysis and reporting.
 */
export async function test_api_moderation_actions_admin_filter_by_action_type(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "!Aa"; // Meets password complexity

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "content_moderator",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test filtering by specific action types
  const actionTypes = [
    "content_removal",
    "user_warning",
    "temporary_ban",
    "permanent_ban",
    "content_review",
  ] as const;

  for (const actionType of actionTypes) {
    // Test search with specific action type filter
    const searchResult: IPageICommunityPlatformModerationAction.ISummary =
      await api.functional.communityPlatform.admin.moderationActions.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            action_type: actionType,
            status: "completed",
          } satisfies ICommunityPlatformModerationAction.IRequest,
        },
      );
    typia.assert(searchResult);

    // Validate pagination structure
    TestValidator.equals(
      `pagination structure valid for ${actionType}`,
      searchResult.pagination,
      {
        current: 1,
        limit: 10,
        records: searchResult.pagination.records,
        pages: searchResult.pagination.pages,
      } satisfies IPage.IPagination,
    );

    // Validate data array structure
    TestValidator.predicate(
      `data is array for ${actionType}`,
      Array.isArray(searchResult.data),
    );

    // If there are results, validate their structure
    if (searchResult.data.length > 0) {
      for (const action of searchResult.data) {
        typia.assert(action);
        TestValidator.equals(
          `action type matches filter ${actionType}`,
          action.action_type,
          actionType,
        );
      }
    }
  }

  // Step 3: Test combined filtering with date range
  const currentDate = new Date().toISOString();
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago

  const combinedSearch: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          action_type: "content_removal",
          status: "completed",
          created_after: pastDate,
          created_before: currentDate,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(combinedSearch);

  // Step 4: Test search term functionality
  const searchWithTerm: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          action_type: "user_warning",
          search: "violation",
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(searchWithTerm);

  // Step 5: Test search with non-existent action type
  const emptySearch: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          action_type: "non_existent_action_type",
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(emptySearch);

  // Should return empty results for non-existent action type
  TestValidator.equals(
    "empty results for non-existent action type",
    emptySearch.data.length,
    0,
  );

  // Step 6: Test pagination with different page sizes
  const paginationTest: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
          action_type: "user_warning",
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(paginationTest);

  TestValidator.equals(
    "correct page number in pagination",
    paginationTest.pagination.current,
    2,
  );

  TestValidator.equals(
    "correct limit in pagination",
    paginationTest.pagination.limit,
    5,
  );

  // Step 7: Test severity level filtering
  const severitySearch: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          action_type: "temporary_ban",
          severity_level: "high",
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(severitySearch);
}
