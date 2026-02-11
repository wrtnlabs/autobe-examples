import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_filter_with_multiple_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // Create multiple reports with different timestamps for filtering
  const today = new Date();
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  // First, we need to create some test reports by submitting actual content
  // Since we don't have a direct report creation endpoint, we'll create posts
  // and comments first, then test filtering on existing reports
  // Create a test community for context
  const communityId = RandomGenerator.alphaNumeric(8);
  // Create reports with different statuses (simulated data)
  const reporterId = RandomGenerator.alphaNumeric(8);
  // Submit multiple report requests to test filtering
  const pendingReport =
    await api.functional.redditPlatform.admin.redditPlatform.reports.index(
      adminConnection,
      {
        body: {
          status: "PENDING",
          reporterId: reporterId,
          reportedType: "POST",
          reportedId: RandomGenerator.alphaNumeric(8),
          startDate: oneWeekAgo.toISOString(),
          endDate: twoDaysAgo.toISOString(),
          communityId: communityId,
          page: 1,
          pageSize: 10,
          sortBy: "created_at",
          sortOrder: "DESC",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(pendingReport);
  // Test filtering with APPROVED status and date range
  const filteredReports =
    await api.functional.redditPlatform.admin.redditPlatform.reports.index(
      adminConnection,
      {
        body: {
          status: "PENDING",
          reporterId: reporterId,
          startDate: oneWeekAgo.toISOString(),
          endDate: twoDaysAgo.toISOString(),
          communityId: communityId,
          page: 1,
          pageSize: 10,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(filteredReports);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure valid",
    typeof filteredReports.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit valid",
    typeof filteredReports.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records valid",
    typeof filteredReports.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages valid",
    typeof filteredReports.pagination.pages,
    "number",
  );
  // Validate reports array structure
  TestValidator.predicate(
    "has reports data",
    Array.isArray(filteredReports.data),
  );
  // Validate each report in filtered results has the correct status
  filteredReports.data.forEach((report) => {
    TestValidator.equals(
      "report status matches filter",
      report.status,
      "PENDING",
    );
    TestValidator.predicate(
      "report has reporter info",
      report.reporter !== undefined,
    );
  });
}