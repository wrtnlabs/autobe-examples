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

/**
 * Validate moderation audit log pagination and date-range filtering for
 * platform admins.
 *
 * Business flow:
 *
 * 1. Join a member user, a community moderator, and a platform admin using their
 *    auth.join endpoints.
 * 2. As platform admin, create a community visibility level master record.
 * 3. As member user, create a community that references the created visibility
 *    level code.
 * 4. As member user, create multiple moderation reports (>=3) associated with the
 *    community.
 * 5. As community moderator, create moderation actions that conceptually respond
 *    to those reports, each in the same community.
 * 6. As platform admin, call PATCH
 *    /communityPlatform/platformAdmin/moderationAuditLogs with a broad from/to
 *    window and pagination (page=1, limit=2) and assert pagination metadata and
 *    data length.
 * 7. Call the same endpoint for page=2 and ensure ids do not overlap with page 1.
 * 8. Perform a narrower from/to filter based on timestamps from prior responses
 *    and assert that only in-range entries are returned and that they form a
 *    subset of the broader window.
 */
export async function test_api_moderation_audit_log_pagination_and_date_range(
  connection: api.IConnection,
) {
  // 1. Register actors: member user, community moderator, platform admin.
  const baseHref = "https://example.com/join" as string & tags.Format<"uri">;
  const baseReferrer = "https://example.com/" as string & tags.Format<"uri">;

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: baseHref,
    referrer: baseReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: baseHref,
    referrer: baseReferrer,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;
  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const platformJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    href: baseHref,
    referrer: baseReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platform admin, create a community visibility level.
  const visibilityCreateBody = {
    code: `code-${RandomGenerator.alphaNumeric(8)}`,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibility);

  // 3. Switch to member user explicitly via login to ensure memberUser context.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 4. Member user creates a community using the visibility level code.
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Member user creates multiple reports (>=3) for this community.
  const reportCount = 3;
  const reports: ICommunityPlatformReport[] = [];
  for (let i = 0; i < reportCount; i++) {
    const reportBody = {
      reporter_type: "member",
      report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
      community_id: community.id,
      severity: RandomGenerator.pick(["low", "medium", "high"] as const),
      description: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies ICommunityPlatformReport.ICreate;
    const report: ICommunityPlatformReport =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        { body: reportBody },
      );
    typia.assert(report);
    reports.push(report);
  }

  TestValidator.predicate(
    "at least three reports should be created",
    reports.length >= 3,
  );

  // 6. Login as community moderator to ensure moderator context.
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;
  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 7. Create moderation actions as community moderator; one per report, all scoped to the community.
  const actions: ICommunityPlatformModerationAction[] = [];
  for (const report of reports) {
    const actionBody = {
      community_id: community.id,
      action_type: RandomGenerator.pick([
        "no_action",
        "remove_content",
        "warn_user",
      ] as const),
      target_scope: RandomGenerator.pick([
        "post",
        "comment",
        "community",
      ] as const),
      reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
      notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ICommunityPlatformModerationAction.ICreate;
    const action: ICommunityPlatformModerationAction =
      await api.functional.communityPlatform.communityModerator.moderationActions.create(
        connection,
        { body: actionBody },
      );
    typia.assert(action);
    actions.push(action);
  }

  TestValidator.predicate(
    "at least as many moderation actions as reports should exist",
    actions.length >= reports.length,
  );

  // 8. Switch back to platform admin for audit log search.
  const platformLoginBody = {
    identifier: platformJoinBody.email,
    password: platformJoinBody.password,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const platformLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformLoginBody,
    });
  typia.assert(platformLoginAuthorized);

  // 9. Initial broad search to discover audit log entries and time window.
  const broadRequest = {
    // leave page/limit undefined to get default behavior
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;
  const broadPage: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.moderationAuditLogs.index(
      connection,
      { body: broadRequest },
    );
  typia.assert(broadPage);

  const allAuditLogs: ICommunityPlatformModerationAuditLog.ISummary[] =
    broadPage.data;

  TestValidator.predicate(
    "broad audit log search should return at least one entry",
    allAuditLogs.length >= 1,
  );

  // Compute min and max created_at among returned entries.
  const createdAts = allAuditLogs.map((log) => log.created_at);
  const sortedCreatedAts = [...createdAts].sort();
  const minCreatedAt: string & tags.Format<"date-time"> =
    sortedCreatedAts[0] as string & tags.Format<"date-time">;
  const maxCreatedAt: string & tags.Format<"date-time"> = sortedCreatedAts[
    sortedCreatedAts.length - 1
  ] as string & tags.Format<"date-time">;

  // 10. Page 1 request with explicit from/to and limit=2.
  const page1Request = {
    page: 1 as number & tags.Type<"int32">,
    limit: 2 as number & tags.Type<"int32">,
    from: minCreatedAt,
    to: maxCreatedAt,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;
  const page1: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.moderationAuditLogs.index(
      connection,
      { body: page1Request },
    );
  typia.assert(page1);

  TestValidator.equals(
    "page1 pagination.limit should be 2",
    page1.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "page1 pagination.records should be non-negative",
    page1.pagination.records >= 0,
  );
  if (page1.pagination.records >= 3) {
    TestValidator.predicate(
      "when records >=3, pages should be at least 2 with limit=2",
      page1.pagination.pages >= 2,
    );
  }
  TestValidator.predicate(
    "page1 data length should be between 0 and 2",
    page1.data.length >= 0 && page1.data.length <= 2,
  );

  // 11. Page 2 request with same window and limit.
  const page2Request = {
    page: 2 as number & tags.Type<"int32">,
    limit: 2 as number & tags.Type<"int32">,
    from: minCreatedAt,
    to: maxCreatedAt,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;
  const page2: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.moderationAuditLogs.index(
      connection,
      { body: page2Request },
    );
  typia.assert(page2);

  TestValidator.equals(
    "page2 pagination.limit should be 2",
    page2.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "page2 data length should be between 0 and 2",
    page2.data.length >= 0 && page2.data.length <= 2,
  );

  // Ensure no overlapping ids between page1 and page2 when both have entries.
  const page1Ids = new Set(page1.data.map((log) => log.id));
  const overlapExists = page2.data.some((log) => page1Ids.has(log.id));
  TestValidator.predicate(
    "page1 and page2 should not overlap in ids when both contain entries",
    overlapExists === false,
  );

  // 12. Narrower date-range filter: from pivot to max.
  const pivotLog =
    page1.data.length > 0
      ? page1.data[0]
      : allAuditLogs.length > 0
        ? allAuditLogs[0]
        : undefined;

  if (pivotLog !== undefined) {
    const pivotFrom = pivotLog.created_at;
    const narrowRequest = {
      page: 1 as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
      from: pivotFrom,
      to: maxCreatedAt,
    } satisfies ICommunityPlatformModerationAuditLog.IRequest;

    const narrowPage: IPageICommunityPlatformModerationAuditLog.ISummary =
      await api.functional.communityPlatform.platformAdmin.moderationAuditLogs.index(
        connection,
        { body: narrowRequest },
      );
    typia.assert(narrowPage);

    // All narrow entries should be within [pivotFrom, maxCreatedAt].
    const allInRange = narrowPage.data.every(
      (log) => log.created_at >= pivotFrom && log.created_at <= maxCreatedAt,
    );
    TestValidator.predicate(
      "narrow date-range results should be within [pivotFrom, maxCreatedAt]",
      allInRange,
    );

    // Narrow result ids should be a subset of the broad page ids.
    const broadIds = new Set(allAuditLogs.map((log) => log.id));
    const narrowIsSubset = narrowPage.data.every((log) => broadIds.has(log.id));
    TestValidator.predicate(
      "narrow date-range result ids should be subset of broad results",
      narrowIsSubset,
    );
  }
}
