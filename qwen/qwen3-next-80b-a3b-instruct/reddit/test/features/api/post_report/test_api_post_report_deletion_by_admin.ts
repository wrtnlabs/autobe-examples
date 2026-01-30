import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostReport";
import { prepare_random_community_bbs_post_report } from "../../../prepare/prepare_random_community_bbs_post_report";
import { generate_random_community_bbs_member_post_reports_create } from "../../../generate/generate_random_community_bbs_member_post_reports_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_post_report_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a new connection and authorize member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 3: Member user logs in to submit a post report
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberAuthorization = memberConnection.headers?.Authorization;
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: member.email,
      password:
        typeof memberAuthorization === "string"
          ? memberAuthorization.replace("Bearer ", "")
          : "",
    } satisfies ICommunityBbsMember.ILogin,
  });
  // Create random report data
  const postReportData: ICommunityBbsPostReport.ICreate = {
    target_post_id: typia.random<string & tags.Format<"uuid">>(),
    selected_violation_category_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    comment: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityBbsPostReport.ICreate;
  // Submit report as member (assume the API returns the created report even though SDK shows void)
  // This is required to get the report ID for deletion
  await api.functional.communityBbs.member.post_reports.create(
    memberLoginConnection,
    {
      body: postReportData,
    },
  );
  // Step 4: Admin user logs in to delete the report
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminAuthorization = adminConnection.headers?.Authorization;
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: admin.email,
      password:
        typeof adminAuthorization === "string"
          ? adminAuthorization.replace("Bearer ", "")
          : "",
    } satisfies ICommunityBbsAdmin.ILogin,
  });
  // Delete the report using the ID from the created report
  const deletedReport: ICommunityBbsPostReport =
    await api.functional.communityBbs.admin.post_reports.erase(
      adminLoginConnection,
      {
        reportId: postReportData.target_post_id,
      },
    );
  typia.assert(deletedReport);
  // Validate that the deleted report matches the created one (except status)
  TestValidator.equals(
    "deleted report matches created report",
    deletedReport.id,
    postReportData.target_post_id,
  );
  TestValidator.equals(
    "deleted report target_id matches created report",
    deletedReport.target_id,
    postReportData.target_post_id,
  );
  TestValidator.equals(
    "deleted report reporter_id matches created report",
    deletedReport.reporter_id,
    member.id,
  );
  TestValidator.equals(
    "deleted report category_id matches created report",
    deletedReport.category_id,
    postReportData.selected_violation_category_id,
  );
  // Convert header values to string to match ICommunityBbsPostReport.ip_address type
  TestValidator.equals(
    "deleted report ip_address matches created report",
    deletedReport.ip_address,
    String(memberConnection.headers?.["X-Forwarded-For"] || "unknown"),
  );
  // Convert header values to string to match ICommunityBbsPostReport.user_agent type
  TestValidator.equals(
    "deleted report user_agent matches created report",
    deletedReport.user_agent,
    String(memberConnection.headers?.["User-Agent"] || "unknown"),
  );
  TestValidator.equals(
    "deleted report created_at matches created report",
    deletedReport.created_at,
    new Date().toISOString(),
  );
  // Validate that status is now resolved and resolved_by_id is set
  TestValidator.equals(
    "deleted report status is resolved",
    deletedReport.status,
    "resolved",
  );
  TestValidator.predicate(
    "deleted report has resolved_by_id",
    deletedReport.resolved_by_id !== undefined &&
      deletedReport.resolved_by_id !== null,
  );
  TestValidator.predicate(
    "deleted report has resolved_at",
    deletedReport.resolved_at !== undefined &&
      deletedReport.resolved_at !== null,
  );
  // Step 5: Validate that member cannot delete reports
  // Re-authenticate member
  const memberLoginConnection2: api.IConnection = { host: connection.host };
  const memberAuthorization2 = memberConnection.headers?.Authorization;
  await authorize_member_login(memberLoginConnection2, {
    body: {
      email: member.email,
      password:
        typeof memberAuthorization2 === "string"
          ? memberAuthorization2.replace("Bearer ", "")
          : "",
    } satisfies ICommunityBbsMember.ILogin,
  });
  // Try to delete the same report as member - should fail
  await TestValidator.error("member cannot delete post report", async () => {
    await api.functional.communityBbs.admin.post_reports.erase(
      memberLoginConnection2,
      {
        reportId: postReportData.target_post_id,
      },
    );
  });
}
