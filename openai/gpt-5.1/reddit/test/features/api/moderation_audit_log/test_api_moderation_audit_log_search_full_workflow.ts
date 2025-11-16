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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

export async function test_api_moderation_audit_log_search_full_workflow(
  connection: api.IConnection,
) {
  // 1. Register member user (reporter/appellant)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Password123!",
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);
  const memberUserId = memberAuthorized.id;

  // 2. Register community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}+mod@example.com`,
    password: "Password123!",
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://client.example.com/mod/signup",
    referrer: "https://client.example.com/mod/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 3. Register platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}+admin@example.com`,
    password: "Password123!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 4. As platform admin, create visibility level for communities
  const visibilityCode = `public_${RandomGenerator.alphabets(5)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 5. As member user, create a community using the new visibility level
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: null,
      href: "https://client.example.com/login",
      referrer: "https://client.example.com/home",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);
  const communityId = community.id;

  // 6. As member user, create a report in that community
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: communityId,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);
  const reportId = report.id;

  // 7. As community moderator, create a moderation action responding to the report
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoinBody.email,
      password: moderatorJoinBody.password,
      ip: null,
      href: "https://client.example.com/mod/login",
      referrer: "https://client.example.com/mod/home",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const moderationActionCreateBody = {
    community_id: communityId,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: "Reported content violates rules",
    notes_internal: "Removed content based on member report.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      { body: moderationActionCreateBody },
    );
  typia.assert(moderationAction);
  const moderationActionId = moderationAction.id;

  // 8. As platform admin, create a user sanction based on the report
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/dashboard",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const userSanctionCreateBody = {
    community_platform_report_id: reportId,
    sanctioned_memberuser_id: memberUserId,
    community_id: communityId,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Policy violation: abusive content",
    notes_internal: "Temporary ban applied for abusive behavior.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const userSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: userSanctionCreateBody },
    );
  typia.assert(userSanction);
  const userSanctionId = userSanction.id;

  // 9. As member user, create an appeal on the sanction/report
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: null,
      href: "https://client.example.com/login",
      referrer: "https://client.example.com/home",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const appealCreateBody = {
    appeal_scope: "sanction",
    reason_summary: "I believe the sanction is too harsh",
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      { body: appealCreateBody },
    );
  typia.assert(appeal);
  const appealId = appeal.id;

  // 10. Query moderation audit logs as platform admin over a time window that should include all events
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/dashboard",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const from = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sortBy: "created_at",
    sortDirection: "desc",
    from,
    to,
    actorTypes: ["communityModerator", "platformAdmin"],
    actorIds: undefined,
    communityIds: [communityId],
    actionTypes: undefined,
    targetEntityTypes: undefined,
    outcomeStatuses: undefined,
    search: undefined,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const page:
    | IPageICommunityPlatformModerationAuditLog.ISummary
    | IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.moderationAuditLogs.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page);

  // 11. Basic pagination and non-empty data validation
  TestValidator.predicate(
    "moderation audit log search should return at least one record",
    page.pagination.records > 0 && page.data.length > 0,
  );

  // 12. Ensure at least one audit log references our report, moderation action, user sanction, or appeal
  const matched = page.data.find((log) => {
    return (
      log.report_id === reportId ||
      log.moderation_action_id === moderationActionId ||
      log.user_sanction_id === userSanctionId ||
      log.appeal_id === appealId
    );
  });

  TestValidator.predicate(
    "at least one moderation audit log entry should reference the created entities",
    matched !== undefined,
  );

  if (matched !== undefined) {
    // 13. Validate key fields for the matched log entry
    TestValidator.predicate(
      "matched audit log has a non-empty action_type",
      matched.action_type.length > 0,
    );
    TestValidator.predicate(
      "matched audit log has a non-empty outcome",
      matched.outcome.length > 0,
    );

    // created_at must be within our queried window
    const createdAtDate = new Date(matched.created_at);
    TestValidator.predicate(
      "matched audit log created_at is within the queried time window",
      createdAtDate >= new Date(from) && createdAtDate <= new Date(to),
    );

    if (matched.community_id !== null && matched.community_id !== undefined) {
      TestValidator.equals(
        "matched audit log community_id should match created community id",
        matched.community_id,
        communityId,
      );
    }
  }
}
