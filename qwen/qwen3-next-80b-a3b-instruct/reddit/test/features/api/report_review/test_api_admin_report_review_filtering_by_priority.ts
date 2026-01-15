import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTracking";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportTracking";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_report_review_filtering_by_priority(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Admin connection now has authentication token
  typia.assert(adminAuth);
  // Step 2: Retrieve reports and test priority level filtering
  // Get all reports to establish baseline
  const allReportsResponse: IPageICommunityPlatformReportTracking =
    await api.functional.communityPlatform.admin.reports.admin.reviews.index(
      adminConnection,
    );
  typia.assert(allReportsResponse);
  // Get list of unique priority levels from existing reports
  const existingPriorityLevels = Array.from(
    new Set(allReportsResponse.data.map((report) => report.priority_level)),
  );
  // Test filtering by each existing priority level
  for (const priorityLevel of existingPriorityLevels) {
    // Make API call to get reports filtered by this priority level
    const filteredResponse: IPageICommunityPlatformReportTracking =
      await api.functional.communityPlatform.admin.reports.admin.reviews.index(
        adminConnection,
      );
    // Extract all reports with the target priority level from the full set
    const expectedReports = allReportsResponse.data.filter(
      (report) => report.priority_level === priorityLevel,
    );
    // Validate that pagination metadata reflects filtered count
    TestValidator.equals(
      "filtered reports count matches pagination records",
      expectedReports.length,
      filteredResponse.pagination.records,
    );
    // Validate that all returned reports have the correct priority level
    TestValidator.predicate(
      "all returned reports have correct priority level",
      () =>
        filteredResponse.data.every(
          (report) => report.priority_level === priorityLevel,
        ),
    );
    // Validate that no reports with other priority levels are included
    TestValidator.predicate(
      "no reports with wrong priority level are included",
      () =>
        filteredResponse.data.filter(
          (report) => report.priority_level !== priorityLevel,
        ).length === 0,
    );
  }
}
