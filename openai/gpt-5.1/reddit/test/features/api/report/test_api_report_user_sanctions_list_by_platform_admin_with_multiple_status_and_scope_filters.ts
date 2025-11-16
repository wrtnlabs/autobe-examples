import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSanction";

export async function test_api_report_user_sanctions_list_by_platform_admin_with_multiple_status_and_scope_filters(
  connection: api.IConnection,
) {
  // 1. Member user joins (this also authenticates the member actor)
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      ip: null,
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  // 2. As member user, create a community using a presumed existing visibility level code
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Member subscribes to the community
  const subscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription);

  // 4. Member creates a report scoped to this community
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // 5. Platform admin joins (this authenticates the platformAdmin actor)
  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(2),
      ip: undefined,
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/landing",
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminJoin);

  // 6. Record an initial moderation action for the report
  const moderationActionBody = {
    community_id: community.id,
    action_type: "review_and_warn",
    target_scope: "user",
    reason_summary: "Initial moderation action prior to sanctions",
    notes_internal: "Preliminary review completed.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: moderationActionBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // Helper timestamps for sanction windows
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const inThreeHours = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const windowStart = now.toISOString();
  const windowEnd = inTwoHours.toISOString();

  // 7. Create community-scoped sanctions with varied status and effective_from windows
  const communityActiveInside =
    await api.functional.communityPlatform.platformAdmin.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: {
          community_platform_report_id: report.id,
          sanctioned_memberuser_id: memberJoin.id,
          community_id: community.id,
          sanction_type: "temporary_community_ban",
          status: "active",
          effective_from: windowStart,
          effective_until: inTwoHours.toISOString(),
          reason_summary: "Active community ban with start inside window",
          notes_internal: null,
        } satisfies ICommunityPlatformUserSanction.ICreate,
      },
    );
  typia.assert<ICommunityPlatformUserSanction>(communityActiveInside);

  const communityActiveOutside =
    await api.functional.communityPlatform.platformAdmin.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: {
          community_platform_report_id: report.id,
          sanctioned_memberuser_id: memberJoin.id,
          community_id: community.id,
          sanction_type: "temporary_community_ban",
          status: "active",
          effective_from: inThreeHours.toISOString(),
          effective_until: null,
          reason_summary: "Active community ban starting after filter window",
          notes_internal: null,
        } satisfies ICommunityPlatformUserSanction.ICreate,
      },
    );
  typia.assert<ICommunityPlatformUserSanction>(communityActiveOutside);

  const communityScheduled =
    await api.functional.communityPlatform.platformAdmin.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: {
          community_platform_report_id: report.id,
          sanctioned_memberuser_id: memberJoin.id,
          community_id: community.id,
          sanction_type: "temporary_community_ban",
          status: "scheduled",
          effective_from: windowStart,
          effective_until: inOneHour.toISOString(),
          reason_summary: "Scheduled community ban",
          notes_internal: null,
        } satisfies ICommunityPlatformUserSanction.ICreate,
      },
    );
  typia.assert<ICommunityPlatformUserSanction>(communityScheduled);

  const communityRevoked =
    await api.functional.communityPlatform.platformAdmin.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: {
          community_platform_report_id: report.id,
          sanctioned_memberuser_id: memberJoin.id,
          community_id: community.id,
          sanction_type: "temporary_community_ban",
          status: "revoked",
          effective_from: windowStart,
          effective_until: inOneHour.toISOString(),
          reason_summary: "Revoked community ban",
          notes_internal: null,
        } satisfies ICommunityPlatformUserSanction.ICreate,
      },
    );
  typia.assert<ICommunityPlatformUserSanction>(communityRevoked);

  // Platform-wide sanctions (community_id null)
  const platformActiveInside =
    await api.functional.communityPlatform.platformAdmin.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: {
          community_platform_report_id: report.id,
          sanctioned_memberuser_id: memberJoin.id,
          community_id: null,
          sanction_type: "temporary_platform_ban",
          status: "active",
          effective_from: windowStart,
          effective_until: inTwoHours.toISOString(),
          reason_summary: "Active platform ban with start inside window",
          notes_internal: null,
        } satisfies ICommunityPlatformUserSanction.ICreate,
      },
    );
  typia.assert<ICommunityPlatformUserSanction>(platformActiveInside);

  const platformActiveOutside =
    await api.functional.communityPlatform.platformAdmin.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: {
          community_platform_report_id: report.id,
          sanctioned_memberuser_id: memberJoin.id,
          community_id: null,
          sanction_type: "permanent_platform_ban",
          status: "active",
          effective_from: inThreeHours.toISOString(),
          effective_until: null,
          reason_summary: "Active platform ban starting after filter window",
          notes_internal: null,
        } satisfies ICommunityPlatformUserSanction.ICreate,
      },
    );
  typia.assert<ICommunityPlatformUserSanction>(platformActiveOutside);

  // 8. List sanctions filtered for community-scoped active sanctions whose effective_from is within the window
  const communityFilterBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sanction_type: null,
    status: "active",
    community_id: community.id,
    sanctioned_memberuser_id: null,
    effective_from_from: windowStart,
    effective_from_to: windowEnd,
    effective_until_from: null,
    effective_until_to: null,
    order_by: "effective_from",
    order_direction: "asc",
  } satisfies ICommunityPlatformUserSanction.IRequest;

  const communityPage =
    await api.functional.communityPlatform.platformAdmin.reports.userSanctions.index(
      connection,
      {
        reportId: report.id,
        body: communityFilterBody,
      },
    );
  typia.assert<IPageICommunityPlatformUserSanction.ISummary>(communityPage);

  const communityIds = communityPage.data.map((s) => s.id);

  TestValidator.predicate(
    "only community-scoped active sanctions with effective_from inside window are returned",
    () =>
      communityPage.data.every((summary) => {
        const isActive = summary.status === "active";
        const isCommunityScope =
          summary.community !== undefined &&
          summary.community.id === community.id;
        const startsWithin =
          summary.effectiveFrom >= windowStart &&
          summary.effectiveFrom <= windowEnd;
        return isActive && isCommunityScope && startsWithin;
      }),
  );

  TestValidator.equals(
    "community-scoped active inside-window sanction included",
    true,
    communityIds.includes(communityActiveInside.id),
  );

  TestValidator.equals(
    "community-scoped active outside-window sanction excluded",
    false,
    communityIds.includes(communityActiveOutside.id),
  );

  TestValidator.equals(
    "community scheduled sanction excluded",
    false,
    communityIds.includes(communityScheduled.id),
  );

  TestValidator.equals(
    "community revoked sanction excluded",
    false,
    communityIds.includes(communityRevoked.id),
  );

  TestValidator.equals(
    "platform active sanction excluded from community-scoped filter",
    false,
    communityIds.includes(platformActiveInside.id),
  );

  TestValidator.equals(
    "pagination.records matches data length for community filter when all results fit in one page",
    communityPage.data.length,
    communityPage.pagination.records,
  );

  TestValidator.predicate(
    "pagination.pages is at least 1 for community filter",
    communityPage.pagination.pages >= 1,
  );

  // 9. List sanctions filtered for platform-wide active sanctions whose effective_from is within the window
  const platformFilterBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sanction_type: null,
    status: "active",
    community_id: null,
    sanctioned_memberuser_id: null,
    effective_from_from: windowStart,
    effective_from_to: windowEnd,
    effective_until_from: null,
    effective_until_to: null,
    order_by: "effective_from",
    order_direction: "asc",
  } satisfies ICommunityPlatformUserSanction.IRequest;

  const platformPage =
    await api.functional.communityPlatform.platformAdmin.reports.userSanctions.index(
      connection,
      {
        reportId: report.id,
        body: platformFilterBody,
      },
    );
  typia.assert<IPageICommunityPlatformUserSanction.ISummary>(platformPage);

  const platformIds = platformPage.data.map((s) => s.id);

  TestValidator.predicate(
    "only platform-wide active sanctions with effective_from inside window are returned",
    () =>
      platformPage.data.every((summary) => {
        const isActive = summary.status === "active";
        const isPlatformScope =
          summary.community === undefined || summary.community === null;
        const startsWithin =
          summary.effectiveFrom >= windowStart &&
          summary.effectiveFrom <= windowEnd;
        return isActive && isPlatformScope && startsWithin;
      }),
  );

  TestValidator.equals(
    "platform active inside-window sanction included",
    true,
    platformIds.includes(platformActiveInside.id),
  );

  TestValidator.equals(
    "platform active outside-window sanction excluded",
    false,
    platformIds.includes(platformActiveOutside.id),
  );

  TestValidator.equals(
    "community active inside-window sanction excluded from platform-wide filter",
    false,
    platformIds.includes(communityActiveInside.id),
  );

  TestValidator.equals(
    "pagination.records matches data length for platform filter when all results fit in one page",
    platformPage.data.length,
    platformPage.pagination.records,
  );

  TestValidator.predicate(
    "pagination.pages is at least 1 for platform filter",
    platformPage.pagination.pages >= 1,
  );
}
