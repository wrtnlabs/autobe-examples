import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_moderation_action_detail_for_unrelated_report_not_accessible_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Platform admin onboarding and visibility level creation
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
        email: platformAdminEmail,
        password: "AdminPassword!1",
        displayName: RandomGenerator.name(),
        href: "https://admin.join.example.com/",
        referrer: "https://admin.landing.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  const visibilityCode = `vis-${RandomGenerator.alphabets(8)}`;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Visibility ${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 2. Member user A, community A, subscription, post A, report RA
  const memberAEmail: string = typia.random<string & tags.Format<"email">>();

  const memberAJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: memberAEmail,
      password: "MemberAPassword!1",
      ip: null,
      href: "https://memberA.join.example.com/",
      referrer: "https://memberA.landing.example.com/",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAJoin);

  const communityA =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-a-${RandomGenerator.alphabets(6)}`,
          title: `Community A ${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(communityA);

  const subscriptionA =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: communityA.id,
        body: {
          community_id: communityA.id,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscriptionA);

  const postTypeIdA = typia.random<string & tags.Format<"uuid">>();

  const postA = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        community_id: communityA.id,
        post_type_id: postTypeIdA,
        title: `Post A ${RandomGenerator.alphabets(6)}`,
        body: RandomGenerator.paragraph({ sentences: 10 }),
        url: null,
        image_uri: null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert<ICommunityPlatformPost>(postA);

  const reasonCategoryIdA = typia.random<string & tags.Format<"uuid">>();

  const reportRA =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          report_reason_category_id: reasonCategoryIdA,
          community_id: communityA.id,
          severity: "medium",
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert<ICommunityPlatformReport>(reportRA);

  // 3. Platform admin creates moderation action MA for RA
  const platformAdminLogin = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: {
        identifier: platformAdminEmail,
        password: "AdminPassword!1",
        ip: null,
        href: "https://admin.login.example.com/",
        referrer: "https://admin.login-ref.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminLogin);

  const moderationActionMA =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: reportRA.id,
        body: {
          community_id: communityA.id,
          action_type: "remove_content",
          target_scope: "post",
          reason_summary: "Content violates community A rules",
          notes_internal: "Initial removal action for report RA.",
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationActionMA);

  // 4. Member user B, community B, subscription, post B, report RB
  const memberBEmail: string = typia.random<string & tags.Format<"email">>();

  const memberBJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: memberBEmail,
      password: "MemberBPassword!1",
      ip: null,
      href: "https://memberB.join.example.com/",
      referrer: "https://memberB.landing.example.com/",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberBJoin);

  const communityB =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-b-${RandomGenerator.alphabets(6)}`,
          title: `Community B ${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(communityB);

  const subscriptionB =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: communityB.id,
        body: {
          community_id: communityB.id,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscriptionB);

  const postTypeIdB = typia.random<string & tags.Format<"uuid">>();

  const postB = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        community_id: communityB.id,
        post_type_id: postTypeIdB,
        title: `Post B ${RandomGenerator.alphabets(6)}`,
        body: RandomGenerator.paragraph({ sentences: 10 }),
        url: null,
        image_uri: null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert<ICommunityPlatformPost>(postB);

  const reasonCategoryIdB = typia.random<string & tags.Format<"uuid">>();

  const reportRB =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          report_reason_category_id: reasonCategoryIdB,
          community_id: communityB.id,
          severity: "low",
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert<ICommunityPlatformReport>(reportRB);

  const moderationActionMB =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: reportRB.id,
        body: {
          community_id: communityB.id,
          action_type: "no_action",
          target_scope: "post",
          reason_summary: "Report deemed not actionable for community B.",
          notes_internal: "No content violation identified for report RB.",
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationActionMB);

  // 6. Community moderator onboarding and assignment to community A only
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();

  const moderatorJoin = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        password: "ModeratorPassword!1",
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://moderator.join.example.com/",
        referrer: "https://moderator.landing.example.com/",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderatorJoin);

  const moderatorLogin = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: {
        identifier: moderatorEmail,
        password: "ModeratorPassword!1",
        ip: null,
        href: "https://moderator.login.example.com/",
        referrer: "https://moderator.login-ref.example.com/",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorLogin,
  );

  // Switch back to platform admin to assign moderator to community A
  const platformAdminLoginForAssignment =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: "AdminPassword!1",
        ip: null,
        href: "https://admin.login-assignment.example.com/",
        referrer: "https://admin.login-assignment-ref.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminLoginForAssignment,
  );

  const moderatorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: communityA.identifier,
        body: {
          communityModeratorId: moderatorJoin.id,
          assignedAt: new Date().toISOString(),
          revokedAt: null,
          isActive: true,
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorAssignment>(
    moderatorAssignment,
  );

  // 7. Positive access: moderator can see MA (community A)
  const moderatorLoginForRead =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        identifier: moderatorEmail,
        password: "ModeratorPassword!1",
        ip: null,
        href: "https://moderator.login-read.example.com/",
        referrer: "https://moderator.login-read-ref.example.com/",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorLoginForRead,
  );

  const accessibleAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.at(
      connection,
      {
        reportId: reportRA.id,
        moderationActionId: moderationActionMA.id,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(accessibleAction);

  TestValidator.equals(
    "moderator can access moderation action MA for report RA in community A",
    accessibleAction.id,
    moderationActionMA.id,
  );
  TestValidator.equals(
    "accessibleAction is tied to report RA",
    accessibleAction.community_platform_report_id,
    reportRA.id,
  );

  if (
    accessibleAction.community !== undefined &&
    accessibleAction.community !== null
  ) {
    TestValidator.equals(
      "accessibleAction.community.id matches community A",
      accessibleAction.community.id,
      communityA.id,
    );
  }

  // 8. Negative access: moderator cannot see MB (community B)
  await TestValidator.error(
    "moderator cannot access moderation action MB for report RB in unrelated community B",
    async () => {
      await api.functional.communityPlatform.communityModerator.reports.moderationActions.at(
        connection,
        {
          reportId: reportRB.id,
          moderationActionId: moderationActionMB.id,
        },
      );
    },
  );
}
