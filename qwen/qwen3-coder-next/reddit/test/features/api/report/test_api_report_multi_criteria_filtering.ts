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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_multi_criteria_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create reporter connection for test data
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(reporterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(reporter);
  // Create another reporter for testing reporter ID filtering
  const reporter2Connection: api.IConnection = { host: connection.host };
  const reporter2: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(reporter2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(reporter2);
  // Define time range for testing date filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
  // Create test reports with different timestamps and types
  // Report 1: POST report from reporter1, created 2 hours ago
  const report1 =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      reporterConnection,
      {
        body: {
          reportedType: "POST",
          reportedId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(report1);
  // Report 2: COMMENT report from reporter1, created 1 hour ago
  const report2 =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      reporterConnection,
      {
        body: {
          reportedType: "COMMENT",
          reportedId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(report2);
  // Report 3: POST report from reporter2, created 3 hours ago
  const report3 =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      reporter2Connection,
      {
        body: {
          reportedType: "POST",
          reportedId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(report3);
  // Test 1: Filter by date range only
  const dateRangeResponse =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      connection,
      {
        body: {
          startDate: threeHoursAgo.toISOString(),
          endDate: now.toISOString(),
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  TestValidator.predicate(
    "date range filter returns reports",
    dateRangeResponse.data.length > 0,
  );
  // Test 2: Filter by reporter ID only
  const reporterFilterResponse =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      connection,
      {
        body: {
          reporterId: reporter.id,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(reporterFilterResponse);
  TestValidator.predicate(
    "reporter ID filter returns reports",
    reporterFilterResponse.data.length > 0,
  );
  // Verify all returned reports are from the specified reporter
  for (const report of reporterFilterResponse.data) {
    TestValidator.equals(
      "report reporterId matches filter",
      report.reporterId,
      reporter.id,
    );
  }
  // Test 3: Filter by content type only
  const contentTypeResponse =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      connection,
      {
        body: {
          reportedType: "POST",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(contentTypeResponse);
  TestValidator.predicate(
    "content type filter returns reports",
    contentTypeResponse.data.length > 0,
  );
  // Verify all returned reports are of the specified type
  for (const report of contentTypeResponse.data) {
    TestValidator.equals(
      "report reportedType matches filter",
      report.reportedType,
      "POST",
    );
  }
  // Test 4: Filter by date range and reporter ID
  const dateReporterResponse =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      connection,
      {
        body: {
          startDate: twoHoursAgo.toISOString(),
          endDate: now.toISOString(),
          reporterId: reporter.id,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(dateReporterResponse);
  TestValidator.predicate(
    "date + reporter filter returns reports",
    dateReporterResponse.data.length > 0,
  );
  // Verify both conditions are met
  for (const report of dateReporterResponse.data) {
    TestValidator.equals(
      "report reporterId matches filter",
      report.reporterId,
      reporter.id,
    );
    TestValidator.predicate(
      "report createdAt within date range",
      new Date(report.createdAt) >= twoHoursAgo &&
        new Date(report.createdAt) <= now,
    );
  }
  // Test 5: Filter by date range and content type
  const dateContentTypeResponse =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      connection,
      {
        body: {
          startDate: threeHoursAgo.toISOString(),
          endDate: now.toISOString(),
          reportedType: "POST",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(dateContentTypeResponse);
  TestValidator.predicate(
    "date + content type filter returns reports",
    dateContentTypeResponse.data.length > 0,
  );
  // Verify both conditions are met
  for (const report of dateContentTypeResponse.data) {
    TestValidator.equals(
      "report reportedType matches filter",
      report.reportedType,
      "POST",
    );
    TestValidator.predicate(
      "report createdAt within date range",
      new Date(report.createdAt) >= threeHoursAgo &&
        new Date(report.createdAt) <= now,
    );
  }
  // Test 6: Filter by reporter ID and content type
  const reporterContentTypeResponse =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      connection,
      {
        body: {
          reporterId: reporter.id,
          reportedType: "COMMENT",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(reporterContentTypeResponse);
  TestValidator.predicate(
    "reporter + content type filter returns reports",
    reporterContentTypeResponse.data.length > 0,
  );
  // Verify both conditions are met
  for (const report of reporterContentTypeResponse.data) {
    TestValidator.equals(
      "report reporterId matches filter",
      report.reporterId,
      reporter.id,
    );
    TestValidator.equals(
      "report reportedType matches filter",
      report.reportedType,
      "COMMENT",
    );
  }
  // Test 7: Filter by all three criteria
  const allCriteriaResponse =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      connection,
      {
        body: {
          startDate: twoHoursAgo.toISOString(),
          endDate: now.toISOString(),
          reporterId: reporter.id,
          reportedType: "COMMENT",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(allCriteriaResponse);
  TestValidator.predicate(
    "all criteria filter returns reports",
    allCriteriaResponse.data.length > 0,
  );
  // Verify all conditions are met
  for (const report of allCriteriaResponse.data) {
    TestValidator.equals(
      "report reporterId matches filter",
      report.reporterId,
      reporter.id,
    );
    TestValidator.equals(
      "report reportedType matches filter",
      report.reportedType,
      "COMMENT",
    );
    TestValidator.predicate(
      "report createdAt within date range",
      new Date(report.createdAt) >= twoHoursAgo &&
        new Date(report.createdAt) <= now,
    );
  }
  // Test 8: Verify pagination works with filters
  const paginatedResponse =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      connection,
      {
        body: {
          startDate: threeHoursAgo.toISOString(),
          endDate: now.toISOString(),
          pageSize: 1,
          page: 1,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination returns correct page size",
    paginatedResponse.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination metadata exists",
    paginatedResponse.pagination.pages >= 1 &&
      paginatedResponse.pagination.records >= 0,
  );
}