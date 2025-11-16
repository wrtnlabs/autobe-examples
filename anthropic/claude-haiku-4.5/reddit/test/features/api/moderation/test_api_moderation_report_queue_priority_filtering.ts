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

export async function test_api_moderation_report_queue_priority_filtering(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as a moderator
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Test filtering reports with priority=null (should return all reports)
  const allReportsResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        priority: null,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(allReportsResponse);
  TestValidator.predicate(
    "all reports should have pagination info",
    allReportsResponse.pagination !== null &&
      allReportsResponse.pagination !== undefined,
  );

  // 3. Test filtering reports by critical priority
  const criticalResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        priority: "critical",
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(criticalResponse);

  // Verify all returned reports are critical priority
  if (criticalResponse.data.length > 0) {
    for (const report of criticalResponse.data) {
      TestValidator.equals(
        "report should have critical priority",
        report.priority,
        "critical",
      );
    }
  }

  // 4. Test filtering reports by high priority
  const highResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        priority: "high",
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(highResponse);

  // Verify all returned reports are high priority
  if (highResponse.data.length > 0) {
    for (const report of highResponse.data) {
      TestValidator.equals(
        "report should have high priority",
        report.priority,
        "high",
      );
    }
  }

  // 5. Test filtering reports by medium priority
  const mediumResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        priority: "medium",
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(mediumResponse);

  // Verify all returned reports are medium priority
  if (mediumResponse.data.length > 0) {
    for (const report of mediumResponse.data) {
      TestValidator.equals(
        "report should have medium priority",
        report.priority,
        "medium",
      );
    }
  }

  // 6. Test filtering reports by low priority
  const lowResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        priority: "low",
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(lowResponse);

  // Verify all returned reports are low priority
  if (lowResponse.data.length > 0) {
    for (const report of lowResponse.data) {
      TestValidator.equals(
        "report should have low priority",
        report.priority,
        "low",
      );
    }
  }

  // 7. Test that without priority filter, critical reports should come first in default sorting
  const defaultSortResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        sort_by: "priority_desc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(defaultSortResponse);

  // If there are reports with different priorities, verify sorting order
  if (defaultSortResponse.data.length > 1) {
    const priorityOrder: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    for (let i = 0; i < defaultSortResponse.data.length - 1; i++) {
      const currentPriority =
        priorityOrder[defaultSortResponse.data[i].priority] || 0;
      const nextPriority =
        priorityOrder[defaultSortResponse.data[i + 1].priority] || 0;

      TestValidator.predicate(
        `priority sorting: report at index ${i} should have priority >= report at index ${i + 1}`,
        currentPriority >= nextPriority,
      );
    }
  }

  // 8. Verify pagination works correctly with priority filtering
  TestValidator.predicate(
    "pagination current page should be valid",
    allReportsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    allReportsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count should be non-negative",
    allReportsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count should be non-negative",
    allReportsResponse.pagination.pages >= 0,
  );
}
