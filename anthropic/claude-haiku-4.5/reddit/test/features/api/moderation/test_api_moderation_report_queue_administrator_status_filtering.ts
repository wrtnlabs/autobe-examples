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

export async function test_api_moderation_report_queue_administrator_status_filtering(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as administrator
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      username: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: undefined,
      ip: undefined,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator should be authenticated with valid tokens",
    admin.token.access !== null && admin.token.access !== undefined,
  );

  // 2. Test filtering by "submitted" status
  const submittedReports =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          status: "submitted",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(submittedReports);
  TestValidator.predicate(
    "submitted reports response should have valid pagination",
    submittedReports.pagination.current >= 0 &&
      submittedReports.pagination.limit > 0,
  );
  if (submittedReports.data.length > 0) {
    TestValidator.predicate(
      "all submitted status reports should have submitted status",
      submittedReports.data.every((report) => report.status === "submitted"),
    );
  }

  // 3. Test filtering by "in_review" status
  const inReviewReports =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          status: "in_review",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(inReviewReports);
  if (inReviewReports.data.length > 0) {
    TestValidator.predicate(
      "all in_review status reports should have in_review status",
      inReviewReports.data.every((report) => report.status === "in_review"),
    );
  }

  // 4. Test filtering by "pending_decision" status
  const pendingDecisionReports =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          status: "pending_decision",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(pendingDecisionReports);
  if (pendingDecisionReports.data.length > 0) {
    TestValidator.predicate(
      "all pending_decision status reports should have pending_decision status",
      pendingDecisionReports.data.every(
        (report) => report.status === "pending_decision",
      ),
    );
  }

  // 5. Test filtering by "resolved" status
  const resolvedReports =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          status: "resolved",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(resolvedReports);
  if (resolvedReports.data.length > 0) {
    TestValidator.predicate(
      "all resolved status reports should have resolved status",
      resolvedReports.data.every((report) => report.status === "resolved"),
    );
  }

  // 6. Test filtering by "dismissed" status
  const dismissedReports =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          status: "dismissed",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(dismissedReports);
  if (dismissedReports.data.length > 0) {
    TestValidator.predicate(
      "all dismissed status reports should have dismissed status",
      dismissedReports.data.every((report) => report.status === "dismissed"),
    );
  }

  // 7. Test without status filter to get all reports
  const allReports =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          status: null,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(allReports);
  TestValidator.predicate(
    "all reports response should have valid pagination structure",
    allReports.pagination.records >= 0 && allReports.pagination.pages >= 0,
  );

  // 8. Verify report structure validity
  if (allReports.data.length > 0) {
    const reportSample = allReports.data[0];
    TestValidator.predicate(
      "report should have valid id",
      reportSample.id !== null && reportSample.id !== undefined,
    );
    TestValidator.predicate(
      "report should have valid category",
      reportSample.category !== null && reportSample.category !== undefined,
    );
    TestValidator.predicate(
      "report should have valid status",
      [
        "submitted",
        "in_review",
        "pending_decision",
        "resolved",
        "dismissed",
      ].includes(reportSample.status),
    );
    TestValidator.predicate(
      "report should have valid priority",
      ["critical", "high", "medium", "low"].includes(reportSample.priority),
    );
    TestValidator.predicate(
      "report should have valid created_at timestamp",
      reportSample.created_at !== null && reportSample.created_at !== undefined,
    );
  }

  // 9. Test pagination with different page sizes
  const paginatedReports =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          status: null,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(paginatedReports);
  TestValidator.predicate(
    "paginated response should respect limit parameter",
    paginatedReports.data.length <= 5,
  );
}
