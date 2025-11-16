import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

/**
 * Verify platform admin can search moderation actions by report and action
 * type.
 *
 * Business flow covered:
 *
 * 1. Platform admin self-registers and obtains an authenticated session.
 * 2. Admin creates a community visibility level master (e.g., code "public").
 * 3. A member user self-registers and becomes authenticated.
 * 4. Member creates a community using the created visibility level.
 * 5. Member files a report scoped to that community.
 * 6. Platform admin logs back in and records two moderation actions for the report
 *    with different action_type values for the same community.
 * 7. Platform admin searches moderation actions with filters specifying the
 *    reportId and a single actionTypes value.
 * 8. The test asserts that only moderation actions with the requested actionType
 *    are returned and that pagination metadata is coherent.
 */
export async function test_api_platformadmin_moderation_actions_search_by_report_and_action_type(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (registers) and becomes authenticated on connection
  const adminJoinInput = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPassword!123",
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(), // simple random string; no strict IP type here
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates a visibility level master
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins (self-registers)
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberJoinBody = {
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    email: memberEmail as string & tags.Format<"email">,
    password: "MemberPassword!123",
    ip: null,
    href: "https://app.example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member creates a community referencing the created visibility level
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
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

  // 5. Member files a report scoped to that community
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

  // 6. Switch back to platform admin via login (overwrite connection auth)
  const adminLoginBody = {
    identifier: adminAuthorized.email,
    password: adminJoinInput.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/dashboard" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminReAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReAuth);

  // 7. Admin creates two moderation actions for the same report
  const warnActionType = "warn_user";
  const banActionType = "ban_user";

  const warnActionCreateBody = {
    community_id: community.id,
    action_type: warnActionType,
    target_scope: "user",
    reason_summary: "Issuing warning to user based on report.",
    notes_internal: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const warnAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: warnActionCreateBody,
      },
    );
  typia.assert(warnAction);

  const banActionCreateBody = {
    community_id: community.id,
    action_type: banActionType,
    target_scope: "user",
    reason_summary: "Escalated to user ban based on repeated offenses.",
    notes_internal: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const banAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: banActionCreateBody,
      },
    );
  typia.assert(banAction);

  // 8. Admin searches moderation actions filtered by reportId and actionTypes ["warn_user"]
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    actionTypes: [warnActionType],
    targetScopes: ["user"],
    communityId: community.id,
    reportId: report.id,
    actorType: undefined,
    actorId: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    search: undefined,
    sortField: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const page: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.platformAdmin.moderationActions.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page);

  const pagination = page.pagination;
  const items = page.data;

  // 9. Assertions about filtering and pagination
  TestValidator.predicate(
    "pagination records should be >= returned data length",
    pagination.records >= items.length,
  );

  if (items.length > 0) {
    TestValidator.predicate(
      "pagination pages should be at least 1 when items exist",
      pagination.pages >= 1,
    );
  }

  await ArrayUtil.asyncForEach(items, async (item, index) => {
    TestValidator.equals(
      `all moderation actions should have expected actionType at index ${index}`,
      item.actionType,
      warnActionType,
    );
    if (item.community !== undefined) {
      TestValidator.equals(
        `community id in summary should match created community (index ${index})`,
        item.community.id,
        community.id,
      );
    }
  });

  const hasBanType = ArrayUtil.has(
    items,
    (item) => item.actionType === banActionType,
  );
  TestValidator.predicate(
    "filtered result should not include ban_user action type",
    hasBanType === false,
  );
}
