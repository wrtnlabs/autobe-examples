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

export async function test_api_memberuser_appeal_delete_after_moderation_action(
  connection: api.IConnection,
) {
  // 1. Member user joins (self-registration) and becomes authenticated
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Member user creates a report
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert(report);

  TestValidator.predicate(
    "created report id should be a non-empty uuid string",
    () => typeof report.id === "string" && report.id.length > 0,
  );

  // 3. Member user creates an appeal for that report
  const appealBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: appealBody,
      },
    );
  typia.assert(appeal);

  TestValidator.equals(
    "appeal.report.id should match created report id",
    appeal.report.id,
    report.id,
  );

  // 4. Platform admin joins (registration + authentication)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(20),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  TestValidator.predicate(
    "platform admin id should differ from member user id",
    () => platformAdminAuthorized.id !== memberAuthorized.id,
  );

  // 5. As platform admin, create a moderation action for the report
  const moderationCreateBody = {
    community_id: null,
    action_type: "remove_content",
    target_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    notes_internal: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id as string & tags.Format<"uuid">,
        body: moderationCreateBody,
      },
    );
  typia.assert(moderationAction);

  TestValidator.equals(
    "moderation action should be linked to the created report",
    moderationAction.community_platform_report_id,
    report.id,
  );

  // 6. Switch auth context back to the original member user using login
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/after-appeal",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberReAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberReAuthorized);

  TestValidator.equals(
    "re-authorized member id should match original member id",
    memberReAuthorized.id,
    memberAuthorized.id,
  );

  // 7. As the member user, delete their own appeal even after moderation action
  await api.functional.communityPlatform.memberUser.reports.appeals.erase(
    connection,
    {
      reportId: report.id as string & tags.Format<"uuid">,
      appealId: appeal.id as string & tags.Format<"uuid">,
    },
  );
}
