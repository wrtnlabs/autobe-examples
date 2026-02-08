import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import typia, { tags } from "typia";
import { TestValidator } from "@nestia/e2e";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";

export async function test_api_report_approval_admin(
  connection: api.IConnection,
): Promise<void> {
  // Scenario Description:
  // 1) Admin signs up and gains authorized access
  // 2) A user creates a report
  // 3) Admin approves the report successfully
  // 4) Test approval of non-existing report returns 404
  // 5) Test unauthorized regular user tries to approve and gets 403

  // 1. Admin join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: ICommunityPlatformAdmin.IJoin = {};
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, { body: adminJoinBody });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuth.token.access}`;

  // 2. Create a user report (simulate as regular user connection)
  const userConnection: api.IConnection = { host: connection.host };
  const reportRaw = await generate_random_community_platform_reports_create(userConnection, { body: {} });
  const report = typia.assert(reportRaw);

  // 3. Admin approves the report
  const approvedReportRaw =
    await api.functional.communityPlatform.admin.reports.approve(adminConnection, {
      reportId: (report as any).id as string & tags.Format<"uuid">,
    });
  const approvedReport = typia.assert(approvedReportRaw);

  TestValidator.equals("report status", (approvedReport as any).status as string, "approved");
  TestValidator.equals("approved report id", (approvedReport as any).id as string, (report as any).id as string);

  // 4. Non-existent report approval should return 404
  await TestValidator.httpError("approve non-existent report", 404, async () => {
    await api.functional.communityPlatform.admin.reports.approve(adminConnection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 5. Unauthorized user tries to approve report and should get 403
  await TestValidator.httpError("unauthorized user approve report", 403, async () => {
    await api.functional.communityPlatform.admin.reports.approve(userConnection, {
      reportId: (report as any).id as string & tags.Format<"uuid">,
    });
  });
}
