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
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Validate retrieval of a moderation audit log detail entry for a full
 * moderation workflow including report, moderation action, user sanction, and
 * appeal.
 *
 * Business flow (high-level):
 *
 * 1. Platform admin joins and becomes authenticated.
 * 2. Platform admin creates a community visibility level (e.g., "public").
 * 3. Member user joins and becomes authenticated.
 * 4. Member user creates a community using the visibility level.
 * 5. Member user creates a report belonging to that community.
 * 6. Community moderator joins and becomes authenticated.
 * 7. Community moderator records a moderation action for the report.
 * 8. Platform admin records a user sanction for the report and member user.
 * 9. Member user files an appeal.
 * 10. Platform admin fetches a moderation audit log entry by ID and validates the
 *     response structure.
 *
 * Due to the lack of a search/list API for moderation audit logs, this test
 * uses a randomly generated UUID when calling the detail endpoint and treats
 * the call as a smoke test for type correctness and authorization rather than
 * correlating it with the previously created report/sanction/appeal records.
 */
export async function test_api_moderation_audit_log_detail_for_report_sanction_and_appeal(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (registration + implicit login via join)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a community visibility level
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins
  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.2",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorized);

  // 4. Member user creates a community referencing the visibility level code
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community visibility level code should match",
    community.visibilityLevel.code,
    visibilityLevel.code,
  );

  // 5. Member user creates a report scoped to the community
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 6. Community moderator joins
  const communityModeratorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.3",
    href: "https://moderation.example.com/join",
    referrer: "https://moderation.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModeratorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(communityModeratorAuthorized);

  // 7. Community moderator records a moderation action for the report
  const moderationActionCreateBody = {
    community_id: community.id,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: "Removing reported content for policy violation",
    notes_internal: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  // 8. Switch back to platform admin by logging in
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.4",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminReAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminReAuth);

  // 9. Platform admin records a user sanction in response to the report
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const userSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberUserAuthorized.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil.toISOString(),
    reason_summary: "Temporary ban due to violation of community guidelines",
    notes_internal: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const userSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: userSanctionCreateBody,
      },
    );
  typia.assert(userSanction);

  // 10. Switch to member user context by logging in
  const memberUserLoginBody = {
    identifier: memberUserJoinBody.email,
    password: memberUserJoinBody.password,
    ip: "127.0.0.5",
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberUserReAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberUserLoginBody,
    });
  typia.assert(memberUserReAuth);

  // 11. Member user files an appeal
  const appealCreateBody = {
    appeal_scope: "sanction",
    reason_summary: "Requesting review of temporary community ban",
    details: RandomGenerator.paragraph({ sentences: 12 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealCreateBody,
      },
    );
  typia.assert(appeal);

  // 12. Re-authenticate as platform admin to call moderationAuditLogs.at
  const platformAdminLoginForAuditBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.6",
    href: "https://admin.example.com/login-audit",
    referrer: "https://admin.example.com/audit",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminForAudit: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginForAuditBody,
    });
  typia.assert(platformAdminForAudit);

  // 13. Fetch a moderation audit log detail entry using a random UUID.
  const moderationAuditLogId = typia.random<string & tags.Format<"uuid">>();

  const auditLog: ICommunityPlatformModerationAuditLog =
    await api.functional.communityPlatform.platformAdmin.moderationAuditLogs.at(
      connection,
      {
        moderationAuditLogId,
      },
    );

  // Type-level assertion for the audit log structure
  typia.assert<ICommunityPlatformModerationAuditLog>(auditLog);

  // Basic logical checks on the returned audit log
  TestValidator.predicate(
    "audit log id should be a non-empty string",
    auditLog.id.length > 0,
  );

  TestValidator.predicate(
    "audit log should have a created_at timestamp",
    auditLog.created_at.length > 0,
  );
}
