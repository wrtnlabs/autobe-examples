import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

export async function test_api_moderation_audit_log_filters_by_actor_and_action(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (this also authenticates as platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platformAdmin, create a visibility level to be used by the community
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Register a member user (this authenticates as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create a community using the visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. As memberUser, create a report in that community
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<
      string & tags.Format<"uuid">
    >() /* we don't have an API to fetch categories in this context, so just random UUID that backend accepts in this mock/test environment */,
    community_id: community.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);

  // 6. Register a community moderator (this authenticates as communityModerator)
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(9),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 7. As communityModerator, create a moderation action for that community/report
  const actionType = "remove_content";
  const moderationActionCreateBody = {
    community_id: community.id,
    action_type: actionType,
    target_scope: "post",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      { body: moderationActionCreateBody },
    );
  typia.assert(moderationAction);

  // 8. Switch back to platformAdmin using login
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 9. As platformAdmin, search audit logs filtering by actorTypes ["communityModerator"] and actionTypes [actionType]
  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sortBy: "created_at",
    sortDirection: "desc",
    actorTypes: ["communityModerator"],
    actionTypes: [actionType],
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const pageResult: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.moderationAuditLogs.index(
      connection,
      { body: requestBody },
    );
  typia.assert(pageResult);

  // Basic sanity on pagination metadata
  TestValidator.predicate(
    "pagination limit must be >= 0",
    pageResult.pagination.limit >= 0,
  );

  // 10. Validate all returned logs (if any) have communityModerator actor and matching action_type
  for (const log of pageResult.data) {
    typia.assert<ICommunityPlatformModerationAuditLog.ISummary>(log);

    TestValidator.equals(
      "audit log action_type must match filter actionType",
      log.action_type,
      actionType,
    );

    TestValidator.predicate(
      "communitymoderator_id must be non-null for communityModerator actor filter",
      log.communitymoderator_id !== null &&
        log.communitymoderator_id !== undefined,
    );

    TestValidator.predicate(
      "platformadmin_id must be null for communityModerator actor filter",
      log.platformadmin_id === null || log.platformadmin_id === undefined,
    );
  }

  // 11. Optionally perform a second search for platformAdmin actorType to ensure request shape works
  const platformAdminFilterRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    actorTypes: ["platformAdmin"],
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const platformAdminLogsPage: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.moderationAuditLogs.index(
      connection,
      { body: platformAdminFilterRequestBody },
    );
  typia.assert(platformAdminLogsPage);

  TestValidator.predicate(
    "platformAdmin actor filter pagination limit must be >= 0",
    platformAdminLogsPage.pagination.limit >= 0,
  );

  for (const log of platformAdminLogsPage.data) {
    typia.assert<ICommunityPlatformModerationAuditLog.ISummary>(log);

    TestValidator.predicate(
      "for platformAdmin actor filter, platformadmin_id must be non-null if present",
      log.platformadmin_id !== null && log.platformadmin_id !== undefined,
    );
  }
}
