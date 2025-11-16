import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

export async function test_api_moderator_creates_platform_wide_user_sanction_for_report(
  connection: api.IConnection,
) {
  // 1. Register and implicitly authenticate a community moderator
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 2. Register and implicitly authenticate a member user (sanction target and reporter)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. (Optional but explicit) ensure we are authenticated as member user before creating a report
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/report",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const reloginMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(reloginMember);

  // 4. Create a new report as the member user
  const reportReasonCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: reportReasonCategoryId,
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);

  // 5. Switch authentication context back to community moderator via login
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: null,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const reloginModerator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(reloginModerator);

  // 6. As moderator, create a platform-wide user sanction linked to the report
  const effectiveFrom = new Date().toISOString();
  const effectiveUntil = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const sanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: null,
    sanction_type: "temporary_platform_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: sanctionCreateBody,
      },
    );
  typia.assert(sanction);

  // 7. Business validations on the created sanction

  // id should be non-empty string (type already guaranteed by typia.assert)
  TestValidator.predicate(
    "sanction id should be non-empty",
    sanction.id.length > 0,
  );

  // Sanction must reference the expected report in its summary
  TestValidator.equals(
    "sanction.report.id should match original report id",
    sanction.report.id,
    report.id,
  );

  // Sanction must reference the correct sanctioned member user
  TestValidator.equals(
    "sanctioned member user id should match memberAuthorized.id",
    sanction.sanctioned_memberUser.id,
    memberAuthorized.id,
  );

  // Community scope must be null for platform-wide sanction
  TestValidator.equals(
    "platform-wide sanction should have null community scope",
    sanction.community,
    null,
  );

  // Sanction type and status should match requested values
  TestValidator.equals(
    "sanction_type should persist requested value",
    sanction.sanction_type,
    sanctionCreateBody.sanction_type,
  );

  TestValidator.equals(
    "status should persist requested value",
    sanction.status,
    sanctionCreateBody.status,
  );

  // Effective_from and effective_until should be non-empty and coherent
  TestValidator.equals(
    "effective_from should persist requested value",
    sanction.effective_from,
    sanctionCreateBody.effective_from,
  );

  TestValidator.equals(
    "effective_until should persist requested value",
    sanction.effective_until,
    sanctionCreateBody.effective_until,
  );

  // Reason summary and notes_internal should echo the request
  TestValidator.equals(
    "reason_summary should persist requested value",
    sanction.reason_summary,
    sanctionCreateBody.reason_summary,
  );

  TestValidator.equals(
    "notes_internal should persist requested value",
    sanction.notes_internal,
    sanctionCreateBody.notes_internal,
  );
}
