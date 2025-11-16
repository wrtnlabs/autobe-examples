import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";

/**
 * Validate that an adminUser can retrieve detailed information for a user
 * report created by a memberUser.
 *
 * Business workflow:
 *
 * 1. Register an adminUser (admin join) to represent the moderation staff.
 * 2. Register two memberUsers: one as the reporter and one as the reported target.
 * 3. As the reporter memberUser, create a user report against the target member.
 * 4. As the adminUser, call the admin-only detail endpoint to fetch the report.
 * 5. Assert that the admin detail view matches the created report in all core
 *    fields and that reporter/subject relations are wired correctly.
 */
export async function test_api_user_report_detail_retrieval_for_member_created_report(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain an authenticated admin context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Register the reported (target) memberUser.
  const reportedJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const reportedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: reportedJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reportedMember);

  // 3. Register the reporter memberUser (this call also authenticates as reporter).
  const reporterJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const reporterMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: reporterJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reporterMember);

  // 4. As the reporter memberUser, create a user report against the target member.
  const reportCreateBody = {
    reported_memberuser_id: reportedMember.id,
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    status: "open",
    severity: "medium",
  } satisfies ICommunityPlatformUserReport.ICreate;
  const createdReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(createdReport);

  // Basic invariants on creation response.
  TestValidator.equals(
    "created report target member id should match payload",
    createdReport.reported_memberuser_id,
    reportCreateBody.reported_memberuser_id,
  );
  TestValidator.equals(
    "created report reason_category should match payload",
    createdReport.reason_category,
    reportCreateBody.reason_category,
  );
  TestValidator.equals(
    "created report status should match payload",
    createdReport.status,
    reportCreateBody.status,
  );
  TestValidator.equals(
    "created report severity should match payload",
    createdReport.severity,
    reportCreateBody.severity,
  );

  // Ensure reporter is a member (not an admin) at creation time.
  await TestValidator.predicate(
    "created report should have reporter_memberuser_id set",
    async () =>
      createdReport.reporter_memberuser_id !== null &&
      createdReport.reporter_memberuser_id !== undefined,
  );
  await TestValidator.predicate(
    "created report should not have reporter_adminuser_id set",
    async () =>
      createdReport.reporter_adminuser_id === null ||
      createdReport.reporter_adminuser_id === undefined,
  );

  // 5. Switch back to adminUser context using admin login.
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login" as string & tags.Format<"uri">,
    referrer: "https://example.com/admin" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;
  const adminRelogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminRelogin);

  // 6. As admin, fetch the detailed report via admin userReports.at.
  const detailedReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.at(
      connection,
      {
        userReportId: createdReport.id,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(detailedReport);

  // 7. Validate that key fields match between created and detailed views.
  TestValidator.equals(
    "detail report id should match created report id",
    detailedReport.id,
    createdReport.id,
  );
  TestValidator.equals(
    "detail report target member id should match created",
    detailedReport.reported_memberuser_id,
    createdReport.reported_memberuser_id,
  );
  TestValidator.equals(
    "detail report reason_category should match created",
    detailedReport.reason_category,
    createdReport.reason_category,
  );
  TestValidator.equals(
    "detail report status should match created",
    detailedReport.status,
    createdReport.status,
  );
  TestValidator.equals(
    "detail report severity should match created",
    detailedReport.severity,
    createdReport.severity,
  );

  // Timestamps: created_at should be equal between create and detail views.
  TestValidator.equals(
    "detail report created_at should equal created report created_at",
    detailedReport.created_at,
    createdReport.created_at,
  );

  // Reporter relations in detail view.
  await TestValidator.predicate(
    "detail report should have reporter_member relation populated",
    async () =>
      detailedReport.reporter_member !== null &&
      detailedReport.reporter_member !== undefined,
  );
  if (
    detailedReport.reporter_member !== null &&
    detailedReport.reporter_member !== undefined
  ) {
    TestValidator.equals(
      "detail reporter_member id should match reporter account id",
      detailedReport.reporter_member.id,
      reporterMember.id,
    );
  }
  await TestValidator.predicate(
    "detail report should not have reporter_admin relation populated for member-created report",
    async () =>
      detailedReport.reporter_admin === null ||
      detailedReport.reporter_admin === undefined,
  );

  // Reported member relation in detail view.
  await TestValidator.predicate(
    "detail report should have reported_member relation populated",
    async () => detailedReport.reported_member !== undefined,
  );
  if (detailedReport.reported_member !== undefined) {
    TestValidator.equals(
      "detail reported_member id should match target member id",
      detailedReport.reported_member.id,
      reportedMember.id,
    );
  }

  // Admin-only contextual fields should be null on a fresh report unless
  // auto-assigned/cased by backend; assert null per documentation intent.
  await TestValidator.predicate(
    "detail report should have no assigned_admin by default",
    async () =>
      detailedReport.assigned_admin === null ||
      detailedReport.assigned_admin === undefined,
  );
  await TestValidator.predicate(
    "detail report should have no moderation_case by default",
    async () =>
      detailedReport.moderation_case === null ||
      detailedReport.moderation_case === undefined,
  );
}
