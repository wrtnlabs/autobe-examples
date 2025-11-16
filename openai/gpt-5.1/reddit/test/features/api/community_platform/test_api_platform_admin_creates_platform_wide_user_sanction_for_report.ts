import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Validate that a platform administrator can create a platform-wide user
 * sanction tied to a specific report.
 *
 * Business flow:
 *
 * 1. Register a platform admin (join) so that we have a privileged actor.
 * 2. Register a member user (join) who will later be sanctioned.
 * 3. As the member user, create a report via memberUser/reports.create.
 * 4. Switch back to platform admin via platformAdmin.login.
 * 5. (Optional) Perform a generic userSanctions.create to ensure base path works.
 * 6. Create a report-scoped user sanction via
 *    platformAdmin.reports.userSanctions.create, with community_id = null to
 *    represent a platform-wide sanction.
 * 7. Verify that the sanction is correctly linked to the report and member, and
 *    that platform-wide semantics (community = null) and timing fields are
 *    honoured.
 */
export async function test_api_platform_admin_creates_platform_wide_user_sanction_for_report(
  connection: api.IConnection,
) {
  // 1. Register platform admin and obtain authorized context
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPass!234",
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/join",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register member user (this also authenticates as memberUser actor)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: "MemberPass!234",
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As member, create a report
  const reportCreateBody = {
    reporter_type: "member", // consistent with memberUser actor
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 4. Switch back to platform admin via login
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.console.example.com/login",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 5. Optional: generic user sanction creation pipeline smoke test
  const nowIso = new Date().toISOString();

  const genericSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: null,
    sanction_type: "temporary_platform_ban",
    status: "active",
    effective_from: nowIso,
    effective_until: null,
    reason_summary: "Generic platform-level sanction for testing pipeline.",
    notes_internal: "Smoke test for generic userSanctions.create endpoint.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const genericSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: genericSanctionCreateBody,
      },
    );
  typia.assert(genericSanction);

  TestValidator.equals(
    "generic sanction is linked to correct report via summary",
    genericSanction.report.id,
    report.id,
  );
  TestValidator.equals(
    "generic sanction is linked to correct member user via summary",
    genericSanction.sanctioned_memberUser.id,
    memberAuthorized.id,
  );

  // 6. Create report-scoped, platform-wide sanction via report endpoint
  const effectiveFrom = new Date().toISOString();
  const platformWideSanctionBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: null,
    sanction_type: "permanent_platform_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: null,
    reason_summary: "Permanent platform-wide ban due to severe violation.",
    notes_internal:
      "Issued via report-scoped endpoint; verify platform-wide semantics (community=null).",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const platformWideSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: platformWideSanctionBody,
      },
    );
  typia.assert(platformWideSanction);

  // 7. Business assertions
  TestValidator.equals(
    "platform-wide sanction report id matches created report.id",
    platformWideSanction.report.id,
    report.id,
  );

  TestValidator.equals(
    "platform-wide sanction sanctioned_memberUser.id matches member id",
    platformWideSanction.sanctioned_memberUser.id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "platform-wide sanction community is null (platform-wide scope)",
    platformWideSanction.community,
    null,
  );

  TestValidator.equals(
    "platform-wide sanction type matches request",
    platformWideSanction.sanction_type,
    platformWideSanctionBody.sanction_type,
  );

  TestValidator.equals(
    "platform-wide sanction status matches request",
    platformWideSanction.status,
    platformWideSanctionBody.status,
  );

  TestValidator.equals(
    "platform-wide sanction effective_from matches requested schedule",
    platformWideSanction.effective_from,
    platformWideSanctionBody.effective_from,
  );

  TestValidator.equals(
    "platform-wide sanction effective_until remains null (permanent ban)",
    platformWideSanction.effective_until,
    platformWideSanctionBody.effective_until,
  );

  TestValidator.equals(
    "platform-wide sanction reason_summary matches",
    platformWideSanction.reason_summary,
    platformWideSanctionBody.reason_summary,
  );

  TestValidator.equals(
    "platform-wide sanction notes_internal matches",
    platformWideSanction.notes_internal,
    platformWideSanctionBody.notes_internal,
  );
}
