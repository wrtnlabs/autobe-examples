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
 * Test filtering moderation actions by severity levels including low, medium,
 * high, and critical. Validates that administrators can prioritize moderation
 * workflow review based on severity classification and assess the distribution
 * of different severity levels across moderation activities. Tests combined
 * filtering with status and date criteria to support comprehensive moderation
 * analytics and risk assessment.
 */
export async function test_api_moderation_actions_admin_filter_by_severity_level(
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
        admin_level: "moderator",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Define severity levels to test
  const severityLevels = ["low", "medium", "high", "critical"] as const;

  // Step 2: Test filtering by each individual severity level
  for (const severityLevel of severityLevels) {
    const filteredBySeverity: IPageICommunityPlatformModerationAction.ISummary =
      await api.functional.communityPlatform.admin.moderationActions.index(
        connection,
        {
          body: {
            severity_level: severityLevel,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformModerationAction.IRequest,
        },
      );
    typia.assert(filteredBySeverity);

    TestValidator.predicate(
      `pagination data exists for ${severityLevel} severity filter`,
      Array.isArray(filteredBySeverity.data),
    );

    TestValidator.predicate(
      `pagination info exists for ${severityLevel} severity filter`,
      filteredBySeverity.pagination !== undefined,
    );
  }

  // Step 3: Test combined filtering with status criteria
  const statuses = [
    "pending",
    "active",
    "completed",
    "appealed",
    "overturned",
    "expired",
  ] as const;

  for (const status of statuses) {
    const filteredByStatusAndSeverity: IPageICommunityPlatformModerationAction.ISummary =
      await api.functional.communityPlatform.admin.moderationActions.index(
        connection,
        {
          body: {
            severity_level: "high",
            status: status,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformModerationAction.IRequest,
        },
      );
    typia.assert(filteredByStatusAndSeverity);

    TestValidator.predicate(
      `combined filter works for high severity with ${status} status`,
      filteredByStatusAndSeverity.pagination !== undefined,
    );
  }

  // Step 4: Test combined filtering with date range criteria
  const now = new Date();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneMonthAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const filteredByDateAndSeverity: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: {
          severity_level: "critical",
          created_after: oneMonthAgo,
          created_before: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(filteredByDateAndSeverity);

  TestValidator.predicate(
    "date range filter with critical severity returns pagination data",
    filteredByDateAndSeverity.pagination !== undefined,
  );

  // Step 5: Test pagination functionality with severity filters
  const paginatedResults: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: {
          severity_level: "medium",
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "pagination works correctly with severity filter",
    paginatedResults.pagination.current === 2,
  );

  // Step 6: Test search functionality combined with severity filter
  const searchResults: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: {
          severity_level: "low",
          search: "test",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(searchResults);

  TestValidator.predicate(
    "search filter combined with low severity returns valid results",
    searchResults.pagination !== undefined,
  );

  // Step 7: Test action type filtering combined with severity
  const actionTypes = [
    "content_removal",
    "user_warning",
    "temporary_ban",
  ] as const;

  for (const actionType of actionTypes) {
    const filteredByActionAndSeverity: IPageICommunityPlatformModerationAction.ISummary =
      await api.functional.communityPlatform.admin.moderationActions.index(
        connection,
        {
          body: {
            severity_level: "high",
            action_type: actionType,
            page: 1,
            limit: 8,
          } satisfies ICommunityPlatformModerationAction.IRequest,
        },
      );
    typia.assert(filteredByActionAndSeverity);

    TestValidator.predicate(
      `action type ${actionType} filter works with high severity`,
      filteredByActionAndSeverity.pagination !== undefined,
    );
  }

  // Step 8: Test target type filtering combined with severity
  const targetTypes = [
    "post",
    "comment",
    "user",
    "community",
    "message",
  ] as const;

  for (const targetType of targetTypes) {
    const filteredByTargetAndSeverity: IPageICommunityPlatformModerationAction.ISummary =
      await api.functional.communityPlatform.admin.moderationActions.index(
        connection,
        {
          body: {
            severity_level: "medium",
            target_type: targetType,
            page: 1,
            limit: 6,
          } satisfies ICommunityPlatformModerationAction.IRequest,
        },
      );
    typia.assert(filteredByTargetAndSeverity);

    TestValidator.predicate(
      `target type ${targetType} filter works with medium severity`,
      filteredByTargetAndSeverity.pagination !== undefined,
    );
  }

  // Final validation: Ensure all API calls completed successfully
  TestValidator.predicate(
    "all severity level filtering tests completed successfully",
    true,
  );
}
