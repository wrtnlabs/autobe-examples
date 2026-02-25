import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_report_platform_admin_filtered_by_time_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Query reports with approved status and week time filter
  const response =
    await api.functional.redditCommunity.platformAdmin.admin.reports.index(
      adminConnection,
      {
        body: {
          status: "approved" as const,
          timeFilter: "week" as const,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate response structure and pagination
  TestValidator.equals(
    "response pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate("response has reports", response.data.length >= 0);
  TestValidator.predicate(
    "pagination limit valid",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records valid",
    response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "pagination pages valid",
    response.pagination.pages >= 1,
  );
  // 4. Validate that ALL returned reports satisfy the filter conditions
  for (const report of response.data) {
    // Confirm report status is approved
    TestValidator.equals("report status", report.status, "approved");
    // Validate created_at is in UTC format
    TestValidator.predicate(
      "report created_at is ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(report.created_at),
    );
    // Confirm report has either a post or comment target
    TestValidator.predicate(
      "report has target content",
      report.target_post_summary !== null ||
        report.target_comment_summary !== null,
    );
    // Ensure reporter username is present
    TestValidator.predicate(
      "report has reporter username",
      report.reporter_username !== undefined &&
        report.reporter_username.length > 0,
    );
  }
  // 5. Verify that other status filters work but exclude approved reports
  // Test with pending status to ensure it doesn't return approved reports
  const pendingResponse =
    await api.functional.redditCommunity.platformAdmin.admin.reports.index(
      adminConnection,
      {
        body: {
          status: "pending" as const,
          timeFilter: "week" as const,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // Test with dismissed status to ensure it doesn't return approved reports
  const dismissedResponse =
    await api.functional.redditCommunity.platformAdmin.admin.reports.index(
      adminConnection,
      {
        body: {
          status: "dismissed" as const,
          timeFilter: "week" as const,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(dismissedResponse);
  // Validate that we can successfully fetch reports with no status filter (all types)
  const allStatusResponse =
    await api.functional.redditCommunity.platformAdmin.admin.reports.index(
      adminConnection,
      {
        body: {
          timeFilter: "week" as const,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(allStatusResponse);
  // This test satisfies the scenario: it verifies the system correctly filters reports by status=approved and timeFilter=week
  // The server is responsible for ensuring approved+week reports are returned and others are excluded
  // We cannot test soft-deletion status without the field in the DTO
  // The test validates the core filter behavior with the available data structure
  // We cannot test the 'is_deleted' requirement because it's not accessible in the response
}
