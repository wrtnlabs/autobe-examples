import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Validate that a platform administrator can delete an appeal after it has been
 * created in the context of a report, moderation action, and user sanction.
 *
 * Business flow covered by this test:
 *
 * 1. A member user joins the platform and becomes authenticated.
 * 2. A platform administrator joins (and will later perform privileged actions).
 * 3. A community moderator joins to record a moderation action.
 * 4. As the member user, a report is created via POST
 *    /communityPlatform/memberUser/reports.
 * 5. As a community moderator, a moderation action is recorded via POST
 *    /communityPlatform/communityModerator/moderationActions.
 * 6. As the platform admin, a user sanction is created via POST
 *    /communityPlatform/platformAdmin/userSanctions, tied to the report and the
 *    member user.
 * 7. As the sanctioned member user, an appeal is created via POST
 *    /communityPlatform/memberUser/appeals.
 * 8. As the platform admin, DELETE
 *    /communityPlatform/platformAdmin/appeals/{appealId} is invoked to remove
 *    the appeal.
 *
 * Due to SDK limitations, the test cannot:
 *
 * - Transition the appeal into an explicit "resolved" state (no update/resolve
 *   endpoint exposed),
 * - Or verify deletion via GET calls or 404 checks (no read endpoints provided
 *   and HTTP status testing is prohibited).
 *
 * Instead, this test focuses on:
 *
 * - Creating a coherent chain of artifacts (report -> sanction -> appeal),
 * - Ensuring all creation calls return correctly typed DTOs,
 * - Ensuring a platform admin is able to call the erase endpoint successfully
 *   using the appeal id,
 * - And performing logical consistency checks on IDs within already returned
 *   structures (e.g., sanction.report.id matches the created report id).
 */
export async function test_api_platform_admin_deletes_appeal_after_resolution(
  connection: api.IConnection,
) {
  // 1. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Platform admin joins
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: "203.0.113.10",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 3. Community moderator joins
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModeratorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(communityModeratorAuthorized);

  // 4. As member user, create a report
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  const reportCreateBody = {
    reporter_type: "member",
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

  // 5. As community moderator, create a moderation action
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  const moderationActionBody = {
    community_id: null,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: "Content violates community guidelines",
    notes_internal:
      "Automated test moderation action for appeal deletion flow.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  // 6. As platform admin, create a user sanction tied to the report and member
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(now.getTime() + oneDayMs).toISOString();

  const userSanctionBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: null,
    sanction_type: "temporary_platform_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Test sanction for appeal deletion scenario",
    notes_internal:
      "Applied for automated E2E test; should not affect prod users.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const userSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: userSanctionBody,
      },
    );
  typia.assert(userSanction);

  // Logical consistency checks between sanction and upstream report/member
  TestValidator.equals(
    "sanction report summary id matches created report id",
    userSanction.report.id,
    report.id,
  );
  TestValidator.equals(
    "sanctioned member user id matches member join id",
    userSanction.sanctioned_memberUser.id,
    memberAuthorized.id,
  );

  // 7. As the sanctioned member user, create an appeal
  const memberReloginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberReloginAuthorized);

  const appealCreateBody = {
    appeal_scope: "sanction",
    reason_summary: "I believe the sanction was applied in error.",
    details: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealCreateBody,
      },
    );
  typia.assert(appeal);

  // Sanity checks on appeal associations
  TestValidator.equals(
    "appeal is linked to the same report as the sanction",
    appeal.report.id,
    userSanction.report.id,
  );

  if (appeal.userSanction !== undefined) {
    TestValidator.equals(
      "appeal userSanction summary id matches created sanction id",
      appeal.userSanction.id,
      userSanction.id,
    );
  }

  // 8. As platform admin, delete the appeal using erase endpoint
  const adminReloginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReloginAuthorized);

  await api.functional.communityPlatform.platformAdmin.appeals.erase(
    connection,
    {
      appealId: appeal.id,
    },
  );

  // Since erase returns void and we are not allowed to test HTTP status codes
  // or follow-up 404s, we assert logically that the call completed without
  // throwing, and all related artifacts were successfully established earlier.
  TestValidator.predicate("appeal deletion completed without throwing", true);
}
