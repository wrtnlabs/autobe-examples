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
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Validate that a platform administrator can view a detailed appeal that is
 * tied to a report which already has a moderation action and a user sanction.
 *
 * Business flow covered by this E2E test:
 *
 * 1. A member user joins the platform.
 * 2. The member files a report.
 * 3. A community moderator joins and creates a moderation action on the report.
 * 4. The moderator also creates a user sanction against the reporting member (or
 *    related member) for that report.
 * 5. The member files an appeal against that decision.
 * 6. A platform admin joins (and is authenticated via the join call).
 * 7. The platform admin fetches the appeal detail via GET
 *    /communityPlatform/platformAdmin/reports/{reportId}/appeals/{appealId}.
 *
 * The test then asserts that:
 *
 * - The fetched appeal is the same record created by the member.
 * - The appeal is linked to the correct report (report.id).
 * - The moderationAction summary (if present) matches the created moderation
 *   action.
 * - The userSanction summary (if present) matches the created sanction.
 * - The appellantMemberUser summary matches the member that filed the appeal.
 * - The appeal_scope is preserved, and appeal_status is non-empty, indicating a
 *   valid lifecycle state.
 */
export async function test_api_platform_admin_view_appeal_across_moderation_lifecycle(
  connection: api.IConnection,
) {
  // 1. Member user joins the platform.
  const memberPassword = "P@ssw0rd-" + RandomGenerator.alphaNumeric(8);
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // 2. Member files a report.
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  const reportId = report.id;

  // 3. Community moderator joins.
  const moderatorPassword = "Mod-" + RandomGenerator.alphaNumeric(8);
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://moderator.console.example.com/join",
    referrer: "https://moderator.console.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 4. Moderator creates a moderation action on the report.
  const actionType = "remove_content";
  const targetScope = "post";

  const moderationActionCreateBody = {
    community_id: null,
    action_type: actionType,
    target_scope: targetScope,
    reason_summary: "Content violates community guidelines.",
    notes_internal: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
      connection,
      {
        reportId,
        body: moderationActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  const moderationActionId = moderationAction.id;

  // 5. Moderator creates a user sanction for this member based on the report.
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const userSanctionCreateBody = {
    community_platform_report_id: reportId,
    sanctioned_memberuser_id: memberId,
    community_id: null,
    sanction_type: "temporary_platform_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Serious violation reported and confirmed.",
    notes_internal: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const userSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.create(
      connection,
      {
        reportId,
        body: userSanctionCreateBody,
      },
    );
  typia.assert(userSanction);

  const userSanctionId = userSanction.id;

  // 6. Member logs in again (to simulate a realistic separate client session
  //    before filing the appeal).
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedLogin);

  // 7. Member creates the appeal on the report.
  const appealScope = "sanction";

  const appealCreateBody = {
    appeal_scope: appealScope,
    reason_summary: RandomGenerator.paragraph({ sentences: 4 }),
    details: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId,
        body: appealCreateBody,
      },
    );
  typia.assert(appeal);

  const appealId = appeal.id;

  // 8. Platform admin joins (and is authenticated).
  const platformAdminPassword = "Admin-" + RandomGenerator.alphaNumeric(8);
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://platform.admin.example.com/join",
    referrer: "https://platform.admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 9. Platform admin fetches the appeal detail for the given report/appeal ids.
  const fetchedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.platformAdmin.reports.appeals.at(
      connection,
      {
        reportId,
        appealId,
      },
    );
  typia.assert(fetchedAppeal);

  // Assertions: verify relationships and key summary fields.

  // Appeal identity
  TestValidator.equals(
    "fetched appeal id should match created appeal id",
    fetchedAppeal.id,
    appealId,
  );

  // Appeal -> report linkage
  TestValidator.equals(
    "appeal.report.id should match report id",
    fetchedAppeal.report.id,
    reportId,
  );

  // Appeal scope is preserved
  TestValidator.equals(
    "appeal_scope should be preserved",
    fetchedAppeal.appeal_scope,
    appealScope,
  );

  // Appeal status is a non-empty string
  TestValidator.predicate(
    "appeal_status should be a non-empty string",
    typeof fetchedAppeal.appeal_status === "string" &&
      fetchedAppeal.appeal_status.length > 0,
  );

  // Appellant member user should match the original member id when present
  if (fetchedAppeal.appellantMemberUser !== undefined) {
    TestValidator.equals(
      "appellantMemberUser.id should match original member id",
      fetchedAppeal.appellantMemberUser.id,
      memberId,
    );
  }

  // Moderation action summary, if present, should match the created record.
  if (fetchedAppeal.moderationAction !== undefined) {
    TestValidator.equals(
      "moderationAction summary id should match created moderation action id",
      fetchedAppeal.moderationAction.id,
      moderationActionId,
    );

    TestValidator.equals(
      "moderationAction.actionType should match action_type used during creation",
      fetchedAppeal.moderationAction.actionType,
      actionType,
    );
  }

  // User sanction summary, if present, should match the created sanction.
  if (fetchedAppeal.userSanction !== undefined) {
    TestValidator.equals(
      "userSanction summary id should match created user sanction id",
      fetchedAppeal.userSanction.id,
      userSanctionId,
    );

    TestValidator.equals(
      "userSanction.sanctionType should match sanction_type used during creation",
      fetchedAppeal.userSanction.sanctionType,
      "temporary_platform_ban",
    );

    TestValidator.equals(
      "userSanction.reportId should match report id",
      fetchedAppeal.userSanction.reportId,
      reportId,
    );
  }
}
