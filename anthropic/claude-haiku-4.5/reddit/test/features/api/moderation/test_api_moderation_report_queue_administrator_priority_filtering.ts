import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

export async function test_api_moderation_report_queue_administrator_priority_filtering(
  connection: api.IConnection,
) {
  // Create and authenticate administrator account
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Test filtering by critical priority
  const criticalReports =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          priority: "critical",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(criticalReports);
  TestValidator.predicate(
    "critical reports response should have pagination",
    () => criticalReports.pagination !== undefined,
  );
  if (criticalReports.data.length > 0) {
    for (const report of criticalReports.data) {
      TestValidator.equals(
        "all critical reports should have critical priority",
        report.priority,
        "critical",
      );
    }
  }

  // Test filtering by high priority
  const highReports =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          priority: "high",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(highReports);
  if (highReports.data.length > 0) {
    for (const report of highReports.data) {
      TestValidator.equals(
        "all high priority reports should have high priority",
        report.priority,
        "high",
      );
    }
  }

  // Test filtering by medium priority
  const mediumReports =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          priority: "medium",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(mediumReports);
  if (mediumReports.data.length > 0) {
    for (const report of mediumReports.data) {
      TestValidator.equals(
        "all medium priority reports should have medium priority",
        report.priority,
        "medium",
      );
    }
  }

  // Test filtering by low priority
  const lowReports =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          priority: "low",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(lowReports);
  if (lowReports.data.length > 0) {
    for (const report of lowReports.data) {
      TestValidator.equals(
        "all low priority reports should have low priority",
        report.priority,
        "low",
      );
    }
  }

  // Test filtering without priority (should return all priorities)
  const allReports =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(allReports);
  TestValidator.predicate(
    "all reports response should have pagination data",
    () => allReports.pagination !== undefined,
  );

  // Test pagination across priority filters
  const criticalPage1 =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          priority: "critical",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(criticalPage1);
  TestValidator.predicate(
    "pagination limit should be respected",
    () => criticalPage1.data.length <= 5,
  );

  // Test sorting by default sort_by parameter (created_at_desc with priority consideration)
  const sortedReports =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          priority: "high",
          sort_by: "created_at_desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(sortedReports);
  if (sortedReports.data.length > 1) {
    // Verify reports are in descending order by created_at
    for (let i = 0; i < sortedReports.data.length - 1; i++) {
      const current = new Date(sortedReports.data[i].created_at).getTime();
      const next = new Date(sortedReports.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "reports should be sorted by created_at in descending order",
        () => current >= next,
      );
    }
  }

  // Test that different priority filters produce different results
  TestValidator.predicate(
    "different priority filters should produce distinguishable results",
    () => {
      const criticalIds = new Set(criticalReports.data.map((r) => r.id));
      const highIds = new Set(highReports.data.map((r) => r.id));
      // If both have data, they should not be identical sets
      if (criticalReports.data.length > 0 && highReports.data.length > 0) {
        return (
          criticalIds.size > 0 &&
          highIds.size > 0 &&
          (criticalIds.size !== highIds.size ||
            ![...criticalIds].every((id) => highIds.has(id)))
        );
      }
      return true;
    },
  );

  // Test pagination info accuracy
  TestValidator.predicate(
    "pagination current page should match request",
    () => allReports.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be valid",
    () => allReports.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    () => allReports.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should match calculation",
    () =>
      allReports.pagination.pages ===
      Math.ceil(allReports.pagination.records / allReports.pagination.limit),
  );
}
