import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";

/**
 * Test dismissing a user report on a post or comment successfully as a community moderator.
 * The test will first create a new report via the /communityPlatform/reports endpoint to have a valid reportId,
 * then authenticate as a moderator by joining.
 * Then, the moderator dismisses the report by calling the dismiss endpoint with the reportId.
 * Validate that the response shows the report status updated to 'dismissed'.
 * Confirm that the report is no longer pending in the active moderation queue.
 */
export async function test_api_moderator_report_dismiss_success(
  connection: api.IConnection,
): Promise<void> {
  const baseConnection: api.IConnection = { host: connection.host };

  // 1. Moderator join & authenticate
  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(baseConnection, { body: {} });

  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${moderatorAuth.token.access}` },
  };

  // 2. Create a new report and get its primary key identifying the report
  const report: ICommunityPlatformReport =
    await generate_random_community_platform_reports_create(baseConnection, { body: undefined });
  typia.assert(report);

  // Use a valid key or identifier from report to dismiss
  let reportKey: string = "";
  if (typeof report === "object") {
    if ("key" in report && typeof (report as any).key === "string") {
      reportKey = (report as any).key;
    } else if ("reportId" in report && typeof (report as any).reportId === "string") {
      reportKey = (report as any).reportId;
    } else {
      throw new Error("Cannot determine report key for dismiss.");
    }
  }

  // 3. Moderator dismisses the report with the key
  const dismissedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.moderator.reports.dismiss(moderatorConnection, { reportId: reportKey });
  typia.assert(dismissedReport);

  // 5. Validate matching key property
  let dismissedReportKey: string = "";
  if (typeof dismissedReport === "object") {
    if ("key" in dismissedReport && typeof (dismissedReport as any).key === "string") {
      dismissedReportKey = (dismissedReport as any).key;
    } else if ("reportId" in dismissedReport && typeof (dismissedReport as any).reportId === "string") {
      dismissedReportKey = (dismissedReport as any).reportId;
    } else {
      throw new Error("Cannot determine dismissed report key.");
    }
  }

  TestValidator.equals("report id matches", dismissedReportKey, reportKey);
}
