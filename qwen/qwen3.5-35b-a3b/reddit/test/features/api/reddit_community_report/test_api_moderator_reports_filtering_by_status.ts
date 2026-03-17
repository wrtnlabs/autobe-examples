import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering reports by status for moderator dashboard.
 *
 * Validates that the reports endpoint correctly filters by status parameter
 * (pending, approved, dismissed), enabling moderators to focus their review workflow.
 */
export async function test_api_moderator_reports_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Test filtering by status='pending'
  const pendingReports =
    await api.functional.redditCommunity.member.reports.index(
      memberConnection,
      {
        body: {
          status: "pending" as const,
          pageSize: 50,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  // Validate pending filter results
  TestValidator.equals(
    "pending status filter - data length matches filter count",
    pendingReports.data.length,
    pendingReports.data.filter((r) => r.status === "pending").length,
  );
  // Validate each report has pending status
  for (const report of pendingReports.data) {
    TestValidator.equals(
      "pending report status field matches filter",
      report.status,
      "pending",
    );
  }
  // 3. Test filtering by status='approved'
  const approvedReports =
    await api.functional.redditCommunity.member.reports.index(
      memberConnection,
      {
        body: {
          status: "approved" as const,
          pageSize: 50,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(approvedReports);
  // Validate approved filter results
  TestValidator.equals(
    "approved status filter - data length matches filter count",
    approvedReports.data.length,
    approvedReports.data.filter((r) => r.status === "approved").length,
  );
  // Validate each report has approved status
  for (const report of approvedReports.data) {
    TestValidator.equals(
      "approved report status field matches filter",
      report.status,
      "approved",
    );
  }
  // 4. Test filtering by status='dismissed'
  const dismissedReports =
    await api.functional.redditCommunity.member.reports.index(
      memberConnection,
      {
        body: {
          status: "dismissed" as const,
          pageSize: 50,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(dismissedReports);
  // Validate dismissed filter results
  TestValidator.equals(
    "dismissed status filter - data length matches filter count",
    dismissedReports.data.length,
    dismissedReports.data.filter((r) => r.status === "dismissed").length,
  );
  // Validate each report has dismissed status
  for (const report of dismissedReports.data) {
    TestValidator.equals(
      "dismissed report status field matches filter",
      report.status,
      "dismissed",
    );
  }
  // 5. Test no filter - returns all statuses
  const allReports = await api.functional.redditCommunity.member.reports.index(
    memberConnection,
    {
      body: {
        pageSize: 50,
      } satisfies IRedditCommunityReport.IRequest,
    },
  );
  typia.assert(allReports);
  // Validate all reports returned include various statuses when filter is omitted
  const allStatuses = allReports.data.map((r) => r.status);
  const uniqueStatuses = new Set(allStatuses);
  TestValidator.predicate(
    "all reports include various statuses when no filter",
    uniqueStatuses.size > 0,
  );
  // Validate pagination metadata reflects filtered results
  TestValidator.equals(
    "pending pagination records count matches data length",
    pendingReports.pagination.records,
    pendingReports.data.length,
  );
  TestValidator.equals(
    "approved pagination records count matches data length",
    approvedReports.pagination.records,
    approvedReports.data.length,
  );
  TestValidator.equals(
    "dismissed pagination records count matches data length",
    dismissedReports.pagination.records,
    dismissedReports.data.length,
  );
  TestValidator.equals(
    "all reports pagination records count matches data length",
    allReports.pagination.records,
    allReports.data.length,
  );
  // Validate report structure has required fields (if data exists)
  if (pendingReports.data.length > 0) {
    const sampleReport = pendingReports.data[0];
    TestValidator.notEquals(
      "report has reporter reference",
      sampleReport.reporter,
      null,
    );
    TestValidator.notEquals(
      "report has community reference",
      sampleReport.community,
      null,
    );
  }
}
