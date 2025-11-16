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

export async function test_api_user_report_status_and_severity_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register reporter member user via join
  const reporterJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const reporterAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: reporterJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reporterAuthorized);

  // 2. (Optional) login reporter again to exercise login flow
  const reporterLoginBody = {
    identifier: reporterAuthorized.email,
    password: reporterJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const reporterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: reporterLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reporterLogin);

  // 3. Register reported member user (target) via join
  const reportedJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const reportedAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: reportedJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reportedAuthorized);

  // 4. As reporter member, create a user report targeting reported member
  const initialStatus = "open";
  const initialSeverity = "medium";

  const createReportBody = {
    reported_memberuser_id: reportedAuthorized.id,
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    status: initialStatus,
    severity: initialSeverity,
  } satisfies ICommunityPlatformUserReport.ICreate;

  const originalReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: createReportBody,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(originalReport);

  // Capture original timestamps and key identities
  const originalId = originalReport.id;
  const originalReportedMemberId = originalReport.reported_memberuser_id;
  const originalReporterMemberId = originalReport.reporter_memberuser_id;
  const originalCreatedAt = originalReport.created_at;
  const originalUpdatedAt = originalReport.updated_at;
  const originalReportedSummaryId = originalReport.reported_member?.id ?? null;
  const originalReporterSummaryId = originalReport.reporter_member?.id ?? null;

  // 5. Register an adminUser via join
  const adminUsername = RandomGenerator.name(1);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 6. (Optional) login admin again to ensure login flow and token switching
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/console",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLogin);

  // 7. As admin, update report status and severity
  const newStatus = "resolved" as string & tags.MinLength<1>;
  const newSeverity = "high" as string & tags.MinLength<1>;
  const newReasonDetail = RandomGenerator.paragraph({ sentences: 4 });

  const updateBody = {
    status: newStatus,
    severity: newSeverity,
    reason_detail: newReasonDetail,
  } satisfies ICommunityPlatformUserReport.IUpdate;

  const updated: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.update(
      connection,
      {
        userReportId: originalId,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(updated);

  // 8. Business assertions
  TestValidator.equals(
    "report id should remain the same",
    updated.id,
    originalId,
  );

  TestValidator.equals(
    "reported member id should remain the same",
    updated.reported_memberuser_id,
    originalReportedMemberId,
  );

  TestValidator.equals(
    "reporter member id should remain the same",
    updated.reporter_memberuser_id,
    originalReporterMemberId,
  );

  TestValidator.equals(
    "status should be updated to new value",
    updated.status,
    newStatus,
  );

  TestValidator.equals(
    "severity should be updated to new value",
    updated.severity,
    newSeverity,
  );

  TestValidator.equals(
    "created_at should remain unchanged",
    updated.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should change",
    () => updated.updated_at !== originalUpdatedAt,
  );

  TestValidator.predicate(
    "updated_at should be lexicographically greater",
    () => updated.updated_at > originalUpdatedAt,
  );

  if (originalReportedSummaryId !== null) {
    TestValidator.equals(
      "reported_member summary id should remain the same when present",
      updated.reported_member?.id ?? null,
      originalReportedSummaryId,
    );
  }

  if (originalReporterSummaryId !== null) {
    TestValidator.equals(
      "reporter_member summary id should remain the same when present",
      updated.reporter_member?.id ?? null,
      originalReporterSummaryId,
    );
  }
}
