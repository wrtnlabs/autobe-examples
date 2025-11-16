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
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

export async function test_api_platform_admin_view_user_sanction_for_report(
  connection: api.IConnection,
) {
  // 1. Register core actors: memberUser, communityModerator, platformAdmin
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuth);

  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 2. As platformAdmin, explicitly login and create a visibility level
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuth);

  const visibilityLevelCreateBody = {
    code: `public-${RandomGenerator.alphaNumeric(6)}`,
    name: "Public Community",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Switch to memberUser via explicit login and create a community
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuth);

  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
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

  // 4. As memberUser, create a report scoped to this community
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 5. Switch to communityModerator via explicit login and create a report-scoped sanction
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuth);

  const effectiveFrom = new Date();
  const effectiveUntil = new Date(
    effectiveFrom.getTime() + 24 * 60 * 60 * 1000,
  );

  const moderatorSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuth.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom.toISOString(),
    effective_until: effectiveUntil.toISOString(),
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const moderatorSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: moderatorSanctionCreateBody,
      },
    );
  typia.assert(moderatorSanction);

  // 6. Switch to platformAdmin again and create an additional platform-level sanction
  const platformAdminLoginAuthAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthAgain);

  const platformSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuth.id,
    community_id: null,
    sanction_type: "temporary_platform_ban",
    status: "active",
    effective_from: effectiveFrom.toISOString(),
    effective_until: effectiveUntil.toISOString(),
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const platformSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: platformSanctionCreateBody,
      },
    );
  typia.assert(platformSanction);

  // 7. As platformAdmin, fetch the moderator-created sanction via report-scoped GET
  const viewedSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.reports.userSanctions.at(
      connection,
      {
        reportId: report.id,
        userSanctionId: moderatorSanction.id,
      },
    );
  typia.assert(viewedSanction);

  // 8. Business-level equality/assertions
  TestValidator.equals(
    "viewed sanction id should match moderator-created sanction id",
    viewedSanction.id,
    moderatorSanction.id,
  );

  TestValidator.equals(
    "viewed sanction report id should match original report id",
    viewedSanction.report.id,
    report.id,
  );

  TestValidator.equals(
    "sanctioned member user id should match member user id",
    viewedSanction.sanctioned_memberUser.id,
    memberAuth.id,
  );

  TestValidator.equals(
    "sanction type should be preserved",
    viewedSanction.sanction_type,
    moderatorSanction.sanction_type,
  );

  TestValidator.equals(
    "sanction status should be preserved",
    viewedSanction.status,
    moderatorSanction.status,
  );

  TestValidator.equals(
    "effective_from should be preserved",
    viewedSanction.effective_from,
    moderatorSanction.effective_from,
  );

  TestValidator.equals(
    "effective_until should be preserved",
    viewedSanction.effective_until,
    moderatorSanction.effective_until,
  );

  TestValidator.equals(
    "reason_summary should be preserved",
    viewedSanction.reason_summary,
    moderatorSanction.reason_summary,
  );

  TestValidator.equals(
    "notes_internal should be preserved",
    viewedSanction.notes_internal,
    moderatorSanction.notes_internal,
  );

  if (
    viewedSanction.community !== null &&
    viewedSanction.community !== undefined
  ) {
    TestValidator.equals(
      "community scope should match created community",
      viewedSanction.community.id,
      community.id,
    );
  }

  // 9. Negative test: mismatched reportId should not fetch the sanction
  const mismatchedReportId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "sanction cannot be fetched when reportId does not match its originating report",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.userSanctions.at(
        connection,
        {
          reportId: mismatchedReportId,
          userSanctionId: moderatorSanction.id,
        },
      );
    },
  );
}
