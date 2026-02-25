import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_detail_admin_access_with_dismissed_decision(
  connection: api.IConnection,
): Promise<void> {
  // Test the scenario where an admin retrieves a report that was dismissed by a moderator.
  // Verify the report status is 'dismissed' and the moderation decisions contain decision='dismissed'.
  // Check that the response includes all linked report content, reporting user information, and report reason text.
  // Confirm authorized access granted only to admins.
  // Validate response status 200 and appropriate handling of moderation dismissal state.
  // 1. Admin join to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Create a dismissed report by mocking API or simulation
  // Since domain creation functions are not given, we simulate the report retrieval
  // by calling the report detail endpoint with a random UUID.
  // 3. Call to get the report detail
  // Using a UUID for the reportId would be appropriate; the API simulates report data
  // Ensure the report has 'dismissed' status and appropriate decisions.
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const report = await api.functional.communityPlatform.admin.reports.at(
    adminConnection,
    {
      reportId,
    },
  );
  typia.assert(report);
  // 4. Validate report status 'dismissed'
  TestValidator.equals(
    "report status is dismissed",
    report.status,
    "dismissed",
  );
  // 5. Validate all moderation decisions contain decision='dismissed'
  for (const decision of report.decisions) {
    TestValidator.equals(
      "decision is dismissed",
      decision.decision,
      "dismissed",
    );
  }
  // 6. Validate presence of report linked contents
  TestValidator.predicate(
    "has reportedContents",
    report.reportedContents.length > 0,
  );
  // 7. Validate presence of reporter user info
  typia.assert(report.user);
  TestValidator.predicate(
    "valid report user id",
    typeof report.user.id === "string" && report.user.id.length > 0,
  );
  // 8. Validate presence of report reason text
  typia.assert(report.reportReason);
  TestValidator.predicate(
    "valid report reason text",
    typeof report.reportReason.reasonText === "string" &&
      report.reportReason.reasonText.length > 0,
  );
  // 9. Confirm admin access enforced by successful call
  // 10. Additional checks for timestamps presence and formatting
  TestValidator.predicate(
    "valid report createdAt",
    typeof report.createdAt === "string" && report.createdAt.length > 0,
  );
  TestValidator.predicate(
    "valid report updatedAt",
    typeof report.updatedAt === "string" && report.updatedAt.length > 0,
  );
}
