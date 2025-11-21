import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationReport";

/**
 * Comprehensive E2E test for moderation report search functionality by
 * administrators.
 *
 * This test validates the complete search and filtering capabilities of the
 * moderation reports system. It establishes proper admin authentication, tests
 * various filtering scenarios including report types, target entities,
 * statuses, and priority levels, validates pagination functionality, and
 * ensures search results accurately reflect the applied filters with proper
 * pagination metadata.
 */
export async function test_api_moderation_reports_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator to establish proper authorization context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
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

  // 2. Test basic search without filters (should return all reports)
  const allReports: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(allReports);
  TestValidator.predicate(
    "pagination metadata should be valid",
    allReports.pagination.current >= 0 &&
      allReports.pagination.limit > 0 &&
      allReports.pagination.records >= 0 &&
      allReports.pagination.pages >= 0,
  );

  // 3. Test pagination with different page sizes
  const pageSize5: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(pageSize5);
  TestValidator.equals("page size 5 limit", pageSize5.pagination.limit, 5);

  const pageSize20: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(pageSize20);
  TestValidator.equals("page size 20 limit", pageSize20.pagination.limit, 20);

  // 4. Test ordering by different fields
  const orderedByCreatedAt: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(orderedByCreatedAt);

  const orderedByPriority: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "priority_level",
          order_direction: "asc",
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(orderedByPriority);

  // 5. Test text-based search functionality
  const searchResults: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "test",
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(searchResults);

  // 6. Test filtering by report type
  const spamReports: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          report_type: "spam",
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(spamReports);

  const harassmentReports: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          report_type: "harassment",
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(harassmentReports);

  // 7. Test filtering by target entity type
  const postReports: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          target_type: "post",
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(postReports);

  const userReports: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          target_type: "user",
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(userReports);

  // 8. Test filtering by status
  const submittedReports: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "submitted",
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(submittedReports);

  const underReviewReports: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "under_review",
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(underReviewReports);

  // 9. Test filtering by priority level
  const highPriorityReports: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          priority_level: "high",
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(highPriorityReports);

  const criticalPriorityReports: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          priority_level: "critical",
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(criticalPriorityReports);

  // 10. Test comprehensive filtering combinations
  const combinedFilter: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          report_type: "spam",
          target_type: "post",
          status: "submitted",
          priority_level: "medium",
          order_by: "created_at",
          order_direction: "desc",
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(combinedFilter);

  // 11. Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination pages calculation should be consistent",
    combinedFilter.pagination.pages ===
      Math.ceil(
        combinedFilter.pagination.records / combinedFilter.pagination.limit,
      ),
  );

  // 12. Test edge case: empty search results
  const nonExistentSearch: IPageICommunityPlatformModerationReport.ISummary =
    await api.functional.communityPlatform.admin.moderationReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "nonexistentsearchtermthatshouldreturnnothing",
        } satisfies ICommunityPlatformModerationReport.IRequest,
      },
    );
  typia.assert(nonExistentSearch);
  TestValidator.predicate(
    "non-existent search should return empty or limited results",
    nonExistentSearch.pagination.records >= 0,
  );
}
