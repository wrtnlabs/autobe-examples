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
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

export async function test_api_platform_admin_updates_appeal_status_and_outcome(
  connection: api.IConnection,
) {
  // 1. Create platform admin (join)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = "AdminPass123!";

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 2. Create community visibility level (as platform admin)
  const visibilityCode = `public-${RandomGenerator.alphabets(5)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 3. Create member user (join)
  const memberUserEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberUserPassword = "MemberPass123!";

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberUserEmail,
    password: memberUserPassword,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 4. Create community as member user
  const communityBody = {
    identifier: `community-${RandomGenerator.alphabets(6)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 5. Create report as member user
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportBody },
    );
  typia.assert(report);

  // 6. Create community moderator (join) and login
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword = "ModeratorPass123!";

  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuth);

  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: null,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuth);

  // 7. Create moderation action as community moderator
  const moderationActionBody = {
    community_id: community.id,
    action_type: "no_action",
    target_scope: "report",
    reason_summary: "Initial review completed",
    notes_internal: "Report appears borderline; no immediate content change.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      { body: moderationActionBody },
    );
  typia.assert(moderationAction);

  // 8. Switch back to platform admin via login
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuth);

  const platformAdminId = platformAdminLoginAuth.id;

  // 9. Create user sanction as platform admin
  const now = new Date();
  const effectiveFrom = now.toISOString() as string & tags.Format<"date-time">;
  const effectiveUntil = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const userSanctionBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberUserId,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Policy violation based on report review",
    notes_internal: "Temporary ban applied pending further investigation.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const userSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: userSanctionBody },
    );
  typia.assert(userSanction);

  // 10. Switch back to member user via login (appellant)
  const memberLoginBody = {
    identifier: memberUserEmail,
    password: memberUserPassword,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuth);

  // 11. Create appeal as member user
  const appealCreateBody = {
    appeal_scope: "sanction",
    reason_summary: "I believe the sanction is too strict for the behavior.",
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      { body: appealCreateBody },
    );
  typia.assert(createdAppeal);

  const originalAppealId = createdAppeal.id;
  const originalAppealStatus = createdAppeal.appeal_status;
  const originalUpdatedAt = createdAppeal.updated_at;

  // Basic sanity checks on created appeal associations
  TestValidator.equals(
    "created appeal id should equal captured id",
    createdAppeal.id,
    originalAppealId,
  );
  if (createdAppeal.appellantMemberUser !== undefined) {
    TestValidator.equals(
      "appellant member user should match member user id",
      createdAppeal.appellantMemberUser.id,
      memberUserId,
    );
  }

  // 12. Switch back to platform admin via login for update
  const platformAdminLoginForUpdateAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginForUpdateAuth);

  // 13. Update appeal as platform admin
  const newStatus =
    originalAppealStatus === "submitted" ? "accepted" : "under_review_platform";

  const resolvedAt = new Date().toISOString() as string &
    tags.Format<"date-time">;

  const appealUpdateBody = {
    appeal_status: newStatus,
    appeal_scope: "sanction",
    reason_summary:
      "After review, we have decided to adjust the original decision.",
    details: RandomGenerator.content({ paragraphs: 1 }),
    outcome_summary: "sanction reduced",
    resolved_at: resolvedAt,
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const updatedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.platformAdmin.appeals.update(
      connection,
      {
        appealId: originalAppealId,
        body: appealUpdateBody,
      },
    );
  typia.assert(updatedAppeal);

  // 14. Validate updated appeal properties and associations
  TestValidator.equals(
    "updated appeal id should equal original id",
    updatedAppeal.id,
    originalAppealId,
  );

  TestValidator.equals(
    "updated appeal status should match new status",
    updatedAppeal.appeal_status,
    newStatus,
  );

  TestValidator.equals(
    "updated appeal scope should remain sanction",
    updatedAppeal.appeal_scope,
    appealUpdateBody.appeal_scope,
  );

  TestValidator.predicate(
    "updated appeal outcome_summary should be defined",
    updatedAppeal.outcome_summary !== undefined,
  );

  TestValidator.predicate(
    "updated appeal resolved_at should be defined",
    updatedAppeal.resolved_at !== undefined,
  );

  TestValidator.equals(
    "appeal report id should match created report",
    updatedAppeal.report.id,
    report.id,
  );

  if (updatedAppeal.userSanction !== undefined) {
    TestValidator.equals(
      "appeal user sanction id should match created sanction",
      updatedAppeal.userSanction.id,
      userSanction.id,
    );
  }

  if (updatedAppeal.moderationAction !== undefined) {
    TestValidator.equals(
      "appeal moderation action id should match created moderation action",
      updatedAppeal.moderationAction.id,
      moderationAction.id,
    );
  }

  if (updatedAppeal.appellantMemberUser !== undefined) {
    TestValidator.equals(
      "appellant member user id should match member user id",
      updatedAppeal.appellantMemberUser.id,
      memberUserId,
    );
  }

  if (updatedAppeal.platformAdmin !== undefined) {
    TestValidator.equals(
      "platform admin id on appeal should match acting admin id",
      updatedAppeal.platformAdmin.id,
      platformAdminId,
    );
  }

  TestValidator.predicate(
    "appeal updated_at should change after update",
    updatedAppeal.updated_at !== originalUpdatedAt,
  );

  // 15. Optional negative test: member user should not be able to call admin update
  const memberLoginForNegativeAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginForNegativeAuth);

  await TestValidator.error(
    "member user should not be allowed to call platform admin appeal update",
    async () => {
      await api.functional.communityPlatform.platformAdmin.appeals.update(
        connection,
        {
          appealId: originalAppealId,
          body: appealUpdateBody,
        },
      );
    },
  );
}
