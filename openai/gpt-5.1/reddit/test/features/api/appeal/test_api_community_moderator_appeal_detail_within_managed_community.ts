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

/**
 * Validate that a community moderator can retrieve appeal details for an appeal
 * that belongs to a community created from a member report and that the
 * response contains the expected contextual associations
 * (report/moderationAction/userSanction/appellant). Also ensure that
 * unauthenticated access to the same appeal is rejected at the business logic
 * level.
 *
 * Business flow implemented in this test:
 *
 * 1. Platform admin joins and is authenticated (platformAdmin.join).
 * 2. Platform admin creates a community visibility level that member-created
 *    communities can reference.
 * 3. A member user joins as memberUser.
 * 4. The member user creates a community using the visibility level created by the
 *    admin so that we have a concrete community context.
 * 5. The same member user files a report scoped to that community.
 * 6. A community moderator joins as communityModerator. We assume that the backend
 *    implicitly allows this moderator to moderate the created community when a
 *    moderation action is recorded for it.
 * 7. The community moderator records a moderation action responding to the report
 *    via communityModerator.moderationActions.create, associating it with the
 *    community.
 * 8. The platform admin logs in again and creates a user sanction associated with
 *    the same report and scoped to the same community.
 * 9. The member user logs in again and creates an appeal for that report via
 *    memberUser.reports.appeals.create.
 * 10. The community moderator logs in and calls
 *     communityModerator.appeals.at(appealId) to load the appeal detail.
 *
 * Assertions on the in-scope access:
 *
 * - Typia.assert() validates the returned ICommunityPlatformAppeal structure.
 * - The appeal’s report summary id matches the report created earlier.
 * - When present, the moderationAction summary id matches the moderation action
 *   we created.
 * - When present, the userSanction summary id matches the user sanction we
 *   created.
 * - When present, the appellantMemberUser summary id matches the member user who
 *   created the appeal.
 * - The appeal has non-empty status and scope strings.
 *
 * Authorization edge check:
 *
 * - Using a cloned connection whose headers are cleared (fresh IConnection with
 *   headers: {}), we call the same detail endpoint and confirm via
 *   TestValidator.error that an error is thrown, representing rejection of
 *   unauthenticated access (without asserting a specific HTTP status code).
 */
export async function test_api_community_moderator_appeal_detail_within_managed_community(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-authenticated with tokens)
  const platformAdminPassword = RandomGenerator.alphabets(16);
  const platformAdminEmail = `${RandomGenerator.alphabets(8)}@example.com`;

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(12),
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: RandomGenerator.alphabets(8),
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  // 2. Platform admin creates a visibility level
  const visibilityLevelCreate =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `public-${RandomGenerator.alphabets(6)}`,
          name: "Public",
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(
    visibilityLevelCreate,
  );

  // 3. Member user joins
  const memberPassword = RandomGenerator.alphabets(14);
  const memberEmail = `${RandomGenerator.alphabets(8)}@member.test`;

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: memberEmail,
      password: memberPassword,
      ip: RandomGenerator.alphabets(8),
      href: "https://app.example.com/signup",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  const memberUserId = memberJoin.id;

  // Ensure an authenticated member session explicitly via login
  const memberLogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://app.example.com/login",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  // 4. Member user creates a community scoped with created visibility level
  const communityCreate =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibilityLevelCode: visibilityLevelCreate.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(communityCreate);

  // 5. Member user files a report scoped to this community
  const reportCreate =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          report_reason_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          community_id: communityCreate.id,
          severity: "medium",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert<ICommunityPlatformReport>(reportCreate);

  // 6. Community moderator joins
  const moderatorPassword = RandomGenerator.alphabets(16);
  const moderatorEmail = `${RandomGenerator.alphabets(8)}@mod.test`;

  const moderatorJoin = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        ip: RandomGenerator.alphabets(8),
        href: "https://mod.example.com/join",
        referrer: "https://mod.example.com/",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderatorJoin);

  // Explicit moderator login for clarity
  const moderatorLoginInitial =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        identifier: moderatorEmail,
        password: moderatorPassword,
        ip: null,
        href: "https://mod.example.com/login",
        referrer: "https://mod.example.com/",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorLoginInitial,
  );

  // 7. Moderator records a moderation action linked to the report and community
  const moderationActionCreate =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: {
          community_id: communityCreate.id,
          action_type: "remove_content",
          target_scope: "post",
          reason_summary: "Initial moderation action for reported content",
          notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationActionCreate);

  // 8. Platform admin logs in again and creates a user sanction for the report
  const platformAdminLogin = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: {
        identifier: platformAdminEmail,
        password: platformAdminPassword,
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminLogin);

  const sanctionCreate =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: {
          community_platform_report_id: reportCreate.id,
          sanctioned_memberuser_id: memberUserId,
          community_id: communityCreate.id,
          sanction_type: "temporary_community_ban",
          status: "active",
          effective_from: new Date().toISOString(),
          effective_until: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          reason_summary: "Sanction linked to report for test",
          notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformUserSanction.ICreate,
      },
    );
  typia.assert<ICommunityPlatformUserSanction>(sanctionCreate);

  // 9. Member user logs in again and creates an appeal tied to the report
  const memberRelogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://app.example.com/login",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberRelogin);

  const appealCreate =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: reportCreate.id,
        body: {
          appeal_scope: "sanction",
          reason_summary: "I believe the sanction was too strict.",
          details: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformAppeal.ICreate,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(appealCreate);

  // 10. Community moderator logs in again and fetches the appeal detail
  const moderatorLogin = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: {
        identifier: moderatorEmail,
        password: moderatorPassword,
        ip: null,
        href: "https://mod.example.com/login",
        referrer: "https://mod.example.com/",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorLogin,
  );

  const appealDetail: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.communityModerator.appeals.at(
      connection,
      {
        appealId: appealCreate.id,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(appealDetail);

  // Validate report linkage
  TestValidator.equals(
    "appeal report id matches original report",
    appealDetail.report.id,
    reportCreate.id,
  );

  // Validate appellant member user if present
  if (appealDetail.appellantMemberUser !== undefined) {
    TestValidator.equals(
      "appellant member user matches reporting member",
      appealDetail.appellantMemberUser.id,
      memberUserId,
    );
  }

  // Validate moderation action and user sanction summaries if present
  if (appealDetail.moderationAction !== undefined) {
    TestValidator.equals(
      "appeal moderation action id matches created action",
      appealDetail.moderationAction.id,
      moderationActionCreate.id,
    );
  }

  if (appealDetail.userSanction !== undefined) {
    TestValidator.equals(
      "appeal user sanction id matches created sanction",
      appealDetail.userSanction.id,
      sanctionCreate.id,
    );
  }

  // Basic status and scope consistency checks
  TestValidator.predicate(
    "appeal has non-empty status and scope",
    appealDetail.appeal_status.length > 0 &&
      appealDetail.appeal_scope.length > 0,
  );

  // 11. Unauthenticated access should be rejected at business-logic layer
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated moderator cannot read appeal detail",
    async () => {
      await api.functional.communityPlatform.communityModerator.appeals.at(
        unauthConn,
        {
          appealId: appealCreate.id,
        },
      );
    },
  );
}
