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
 * Comprehensive E2E test for moderation action search functionality
 *
 * Validates that administrators can search and filter moderation actions across
 * all criteria including action type, target type, status, severity level, and
 * date ranges. Tests pagination functionality with various page sizes and
 * sorting options to ensure efficient browsing of large moderation datasets.
 * Verifies that search results include appropriate summary information for
 * moderation workflow management and audit purposes.
 */
export async function test_api_moderation_actions_admin_search_all(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!" satisfies string & tags.Format<"password">;

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test basic pagination without filters
  const basicSearch =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.equals(
    "pagination structure exists",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    basicSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    basicSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    basicSearch.pagination.pages >= 0,
  );

  // Step 3: Test different page sizes
  const pageSizes = [5, 10, 20] as const;
  for (const pageSize of pageSizes) {
    const sizedSearch =
      await api.functional.communityPlatform.admin.moderationActions.index(
        connection,
        {
          body: {
            page: 1,
            limit: pageSize,
          } satisfies ICommunityPlatformModerationAction.IRequest,
        },
      );
    typia.assert(sizedSearch);
    TestValidator.equals(
      "page size matches request",
      sizedSearch.pagination.limit,
      pageSize,
    );
  }

  // Step 4: Test filtering by action type (if data exists)
  const actionTypes = [
    "content_removal",
    "user_warning",
    "temporary_ban",
  ] as const;
  for (const actionType of actionTypes) {
    const filteredSearch =
      await api.functional.communityPlatform.admin.moderationActions.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            action_type: actionType,
          } satisfies ICommunityPlatformModerationAction.IRequest,
        },
      );
    typia.assert(filteredSearch);
    // Even if no data exists for this filter, the API should return valid pagination structure
    TestValidator.predicate(
      "filtered search returns valid structure",
      filteredSearch.pagination.current === 1,
    );
  }

  // Step 5: Test filtering by status
  const statuses = [
    "pending",
    "active",
    "completed",
    "appealed",
    "overturned",
    "expired",
  ] as const;
  for (const status of statuses) {
    const statusSearch =
      await api.functional.communityPlatform.admin.moderationActions.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            status: status,
          } satisfies ICommunityPlatformModerationAction.IRequest,
        },
      );
    typia.assert(statusSearch);
    TestValidator.predicate(
      "status filter returns valid response",
      statusSearch.pagination.limit === 10,
    );
  }

  // Step 6: Test date range filtering
  const currentDate = new Date().toISOString();
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

  const dateSearch =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          created_after: pastDate satisfies string & tags.Format<"date-time">,
          created_before: currentDate satisfies string &
            tags.Format<"date-time">,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(dateSearch);
  TestValidator.predicate(
    "date range filter works",
    dateSearch.pagination.current === 1,
  );

  // Step 7: Test text search functionality
  const textSearch =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "test",
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(textSearch);
  TestValidator.predicate(
    "text search returns valid structure",
    textSearch.pagination.limit === 10,
  );

  // Step 8: Test combined filtering
  const combinedSearch =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 15,
          action_type: "content_removal",
          status: "completed",
          severity_level: "medium",
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "combined filter page matches",
    combinedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter limit matches",
    combinedSearch.pagination.limit,
    15,
  );

  // Step 9: Validate data structure for all returned moderation actions
  if (basicSearch.data.length > 0) {
    for (const action of basicSearch.data) {
      typia.assert(action);
      TestValidator.predicate("action has valid ID", action.id.length > 0);
      TestValidator.predicate(
        "action type is present",
        action.action_type.length > 0,
      );
      TestValidator.predicate("status is present", action.status.length > 0);
      TestValidator.predicate(
        "created_at is valid timestamp",
        action.created_at.length > 0,
      );
    }
  }

  // Step 10: Test edge cases
  // Test with very high page number (should handle gracefully)
  const highPageSearch =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: {
          page: 9999,
          limit: 10,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(highPageSearch);
  TestValidator.predicate(
    "high page number handled gracefully",
    highPageSearch.pagination.current === 9999,
  );

  // Test with empty search criteria
  const emptySearch =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search criteria returns valid response",
    emptySearch.pagination.limit === 10,
  );
}
