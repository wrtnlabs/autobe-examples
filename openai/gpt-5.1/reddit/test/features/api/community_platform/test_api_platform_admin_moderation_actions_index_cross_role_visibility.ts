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
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

export async function test_api_platform_admin_moderation_actions_index_cross_role_visibility(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user who will file a report
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">,
    password: "MemberP@ssw0rd",
    ip: null,
    href: "https://app.example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As the member user, create a report that both moderator and admin will act on
  const reportBody = {
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
        body: reportBody,
      },
    );
  typia.assert(report);

  // 3. Register a community moderator and authenticate as that moderator
  const communityModeratorEmail =
    `${RandomGenerator.alphabets(8)}@moderator.example.com` as string &
      tags.Format<"email">;
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: communityModeratorEmail,
    password: "ModeratorP@ssw0rd",
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://app.example.com/moderator/signup" as string &
      tags.Format<"uri">,
    referrer: "https://app.example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // Explicit login to ensure we can switch back to this moderator later if needed
  const moderatorLoginBody = {
    identifier: communityModeratorEmail,
    password: "ModeratorP@ssw0rd",
    ip: null,
    href: "https://app.example.com/moderator/login" as string &
      tags.Format<"uri">,
    referrer: "https://app.example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 4. As the community moderator, create at least one moderation action on the report
  const moderatorActionBody = {
    community_id: null,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary:
      "Community moderator warning the user for reported behavior.",
    notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderatorAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: moderatorActionBody,
      },
    );
  typia.assert(moderatorAction);

  // 5. Register a platform admin and authenticate as platform admin
  const platformAdminEmail =
    `${RandomGenerator.alphabets(8)}@admin.example.com` as string &
      tags.Format<"email">;
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: platformAdminEmail,
    password: "AdminP@ssw0rd",
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://app.example.com/admin/signup" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Explicit login for platform admin to simulate switching back later as needed
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: "AdminP@ssw0rd",
    ip: null,
    href: "https://app.example.com/admin/login" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 6. As platform admin, create at least one moderation action on the same report
  const adminActionBody = {
    community_id: null,
    action_type: "ban_user",
    target_scope: "user",
    reason_summary: "Platform admin banning the user due to severe violation.",
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const adminAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id as string & tags.Format<"uuid">,
        body: adminActionBody,
      },
    );
  typia.assert(adminAction);

  // 7. As platform admin, index moderation actions for that report without restrictive filters
  const indexRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    actionTypes: undefined,
    targetScopes: undefined,
    communityId: undefined,
    reportId: undefined,
    actorType: undefined,
    actorId: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    search: undefined,
    sortField: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const indexResult: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.index(
      connection,
      {
        reportId: report.id,
        body: indexRequestBody,
      },
    );
  typia.assert(indexResult);

  // 8. Validate that both moderator-created and admin-created actions appear in the index result
  const allActions: ICommunityPlatformModerationAction.ISummary[] =
    indexResult.data;

  const moderatorSummary = allActions.find((a) => a.id === moderatorAction.id);
  const adminSummary = allActions.find((a) => a.id === adminAction.id);

  TestValidator.predicate(
    "platform admin index should contain community moderator's action",
    moderatorSummary !== undefined,
  );

  TestValidator.predicate(
    "platform admin index should contain platform admin's own action",
    adminSummary !== undefined,
  );

  if (moderatorSummary !== undefined && adminSummary !== undefined) {
    // Ensure we can distinguish actor types logically (actorType is opaque string)
    const moderatorActorType = moderatorSummary.performedBy.actorType;
    const adminActorType = adminSummary.performedBy.actorType;

    TestValidator.predicate(
      "moderator and admin actions should have some actorType value",
      moderatorActorType.length > 0 && adminActorType.length > 0,
    );

    TestValidator.predicate(
      "moderator and admin actorTypes should not be empty and can differ",
      moderatorActorType !== "" && adminActorType !== "",
    );
  }

  // 9. Optionally, apply an actorType filter matching platform admin and ensure only admin actions remain
  if (adminSummary !== undefined) {
    const adminActorTypeFilter = adminSummary.performedBy.actorType;

    const filteredRequestBody = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
      actionTypes: undefined,
      targetScopes: undefined,
      communityId: undefined,
      reportId: undefined,
      actorType: adminActorTypeFilter,
      actorId: undefined,
      fromCreatedAt: undefined,
      toCreatedAt: undefined,
      search: undefined,
      sortField: undefined,
      sortDirection: undefined,
    } satisfies ICommunityPlatformModerationAction.IRequest;

    const filteredResult: IPageICommunityPlatformModerationAction.ISummary =
      await api.functional.communityPlatform.platformAdmin.reports.moderationActions.index(
        connection,
        {
          reportId: report.id,
          body: filteredRequestBody,
        },
      );
    typia.assert(filteredResult);

    const filteredActions = filteredResult.data;

    TestValidator.predicate(
      "filtered index by platform admin actorType should contain at least one action",
      filteredActions.length > 0,
    );

    // All actions in filtered list should have performedBy.actorType equal to adminActorTypeFilter
    for (const action of filteredActions) {
      TestValidator.equals(
        "all filtered actions should be performed by platform admin actorType",
        action.performedBy.actorType,
        adminActorTypeFilter,
      );
    }

    const containsModeratorAction = filteredActions.some(
      (a) => a.id === moderatorAction.id,
    );

    TestValidator.predicate(
      "filtered list by platform admin actorType should not contain moderator-created action",
      containsModeratorAction === false,
    );
  }
}
