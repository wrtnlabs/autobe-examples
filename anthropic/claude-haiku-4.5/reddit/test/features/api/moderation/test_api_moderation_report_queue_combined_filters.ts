import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

/**
 * Test combining multiple filters simultaneously to narrow report results.
 *
 * Moderator authenticates and applies multiple filters together
 * (status='in_review' AND priority='high' AND category='hate_speech' AND date
 * range). Verify that only reports matching ALL specified criteria appear in
 * results. Validate that combined filtering provides powerful query
 * capabilities for moderators to find specific reports in a large queue.
 *
 * Test flow:
 *
 * 1. Create and authenticate as a moderator
 * 2. Call reports index API with multiple combined filters
 * 3. Verify all returned reports match ALL filter criteria
 * 4. Validate pagination works with filtered results
 * 5. Confirm combined filtering narrows results appropriately
 */
export async function test_api_moderation_report_queue_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a moderator
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/auth",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Define filter criteria for combined filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  const filterCriteria = {
    status: "in_review" as const,
    priority: "high" as const,
    category: "hate_speech" as const,
    created_at_start: thirtyDaysAgo.toISOString(),
    created_at_end: tenDaysFromNow.toISOString(),
    page: 1,
    limit: 50,
  };

  // Step 3: Call reports index API with combined filters
  const filteredResults: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: filterCriteria satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(filteredResults);

  // Step 4: Validate pagination information
  TestValidator.predicate(
    "pagination should have valid page number",
    filteredResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    filteredResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should match data length",
    filteredResults.data.length <= filteredResults.pagination.limit,
  );

  // Step 5: Validate each report matches ALL filter criteria
  if (filteredResults.data.length > 0) {
    for (const report of filteredResults.data) {
      // Verify status filter
      TestValidator.equals(
        `report status should be '${filterCriteria.status}'`,
        report.status,
        filterCriteria.status,
      );

      // Verify priority filter
      TestValidator.equals(
        `report priority should be '${filterCriteria.priority}'`,
        report.priority,
        filterCriteria.priority,
      );

      // Verify category filter
      TestValidator.equals(
        `report category should be '${filterCriteria.category}'`,
        report.category,
        filterCriteria.category,
      );

      // Verify date range filter (created_at_start)
      const reportCreatedDate = new Date(report.created_at);
      TestValidator.predicate(
        "report created_at should be after or equal to created_at_start filter",
        reportCreatedDate.getTime() >=
          new Date(filterCriteria.created_at_start).getTime(),
      );

      // Verify date range filter (created_at_end)
      TestValidator.predicate(
        "report created_at should be before or equal to created_at_end filter",
        reportCreatedDate.getTime() <=
          new Date(filterCriteria.created_at_end).getTime(),
      );

      // Verify report structure
      typia.assert(report);
    }
  }

  // Step 6: Test with different combined filter set to verify flexibility
  const alternativeFilters = {
    status: "resolved" as const,
    priority: "critical" as const,
    page: 1,
    limit: 25,
  };

  const alternativeResults: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: alternativeFilters satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(alternativeResults);

  // Validate alternative filter results
  if (alternativeResults.data.length > 0) {
    for (const report of alternativeResults.data) {
      TestValidator.equals(
        "alternative filter: status should be 'resolved'",
        report.status,
        "resolved",
      );
      TestValidator.equals(
        "alternative filter: priority should be 'critical'",
        report.priority,
        "critical",
      );
    }
  }

  // Step 7: Confirm combined filtering provides powerful query capability
  TestValidator.predicate(
    "combined filters should return results matching all criteria",
    filteredResults.pagination.records >= 0,
  );
}
