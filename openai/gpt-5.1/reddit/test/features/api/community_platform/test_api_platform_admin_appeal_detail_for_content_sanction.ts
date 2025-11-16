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

export async function test_api_platform_admin_appeal_detail_for_content_sanction(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join implicitly authenticates)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register member user (join implicitly authenticates memberUser actor)
  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorized);

  // 3. As platform admin, create a visibility level
  const visibilityLevelCode = `vl_${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityLevelCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code should match",
    visibilityLevel.code,
    visibilityLevelCode,
  );

  // 4. As member user, create a community
  // (memberUser.join already set Authorization header to member user token)
  const communityIdentifier = `comm_${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
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
  TestValidator.equals(
    "community visibility level code should match creation request",
    community.visibilityLevel.code,
    visibilityLevel.code,
  );

  // 5. As member user, create a report targeting the community context
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
      { body: reportCreateBody },
    );
  typia.assert(report);

  // 6. Create a community moderator, then a moderation action (not strictly linked via DTO but part of scenario context)
  const communityModeratorJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModeratorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(communityModeratorAuthorized);

  const moderationActionCreateBody = {
    community_id: community.id,
    action_type: "remove_content",
    target_scope: "content",
    reason_summary: "Content removed due to reported violation",
    notes_internal: "Automated test moderation action context",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      { body: moderationActionCreateBody },
    );
  typia.assert(moderationAction);

  // 7. Switch to platform admin again via explicit login (optional but demonstrates actor switching)
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 7. Create a user sanction associated with the report & community
  const nowIso = new Date().toISOString();
  const untilIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const userSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberUserAuthorized.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: nowIso as string & tags.Format<"date-time">,
    effective_until: untilIso as string & tags.Format<"date-time">,
    reason_summary: "Test sanction for appeal detail E2E",
    notes_internal:
      "E2E test-only sanction, should be scoped to created community",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const userSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: userSanctionCreateBody },
    );
  typia.assert(userSanction);

  TestValidator.equals(
    "user sanction should reference report id",
    userSanction.report.id,
    report.id,
  );
  TestValidator.equals(
    "user sanction should reference sanctioned member user",
    userSanction.sanctioned_memberUser.id,
    memberUserAuthorized.id,
  );

  // 8. As member user, submit an appeal for the report
  const memberUserLoginBody = {
    identifier: memberUserJoinBody.email,
    password: memberUserJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberUserLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberUserLoginBody,
    });
  typia.assert(memberUserLoginAuthorized);

  const appealScope = "sanction";
  const appealCreateBody = {
    appeal_scope: appealScope,
    reason_summary: "I believe this sanction was unfair",
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: appealCreateBody,
      },
    );
  typia.assert(createdAppeal);

  TestValidator.equals(
    "created appeal should reference report",
    createdAppeal.report.id,
    report.id,
  );
  TestValidator.equals(
    "created appeal should reference appellant member user",
    createdAppeal.appellantMemberUser?.id ?? null,
    memberUserAuthorized.id,
  );

  // 9. Switch back to platform admin and fetch appeal details
  const platformAdminLoginAgainBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginAgainBody,
    });
  typia.assert(platformAdminLoginAgain);

  const appealDetail: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.platformAdmin.appeals.at(
      connection,
      {
        appealId: createdAppeal.id,
      },
    );
  typia.assert(appealDetail);

  // 10. Validate appeal detail fields and relationships
  TestValidator.equals(
    "appeal detail id matches created appeal id",
    appealDetail.id,
    createdAppeal.id,
  );
  TestValidator.equals(
    "appeal detail report id matches original report id",
    appealDetail.report.id,
    report.id,
  );
  if (appealDetail.userSanction !== undefined) {
    TestValidator.equals(
      "appeal detail user sanction id matches created user sanction id",
      appealDetail.userSanction.id,
      userSanction.id,
    );
  }
  if (appealDetail.appellantMemberUser !== undefined) {
    TestValidator.equals(
      "appeal detail appellant member user matches reporter",
      appealDetail.appellantMemberUser.id,
      memberUserAuthorized.id,
    );
  }

  TestValidator.equals(
    "appeal scope in detail matches creation",
    appealDetail.appeal_scope,
    appealScope,
  );

  TestValidator.predicate(
    "appeal status should be non-empty string",
    typeof appealDetail.appeal_status === "string" &&
      appealDetail.appeal_status.length > 0,
  );

  TestValidator.predicate(
    "appeal created_at is non-empty",
    appealDetail.created_at.length > 0,
  );
  TestValidator.predicate(
    "appeal updated_at is non-empty",
    appealDetail.updated_at.length > 0,
  );

  // 11. Negative authorization test: unauthenticated connection should fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to appeal detail should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.appeals.at(
        unauthenticatedConnection,
        {
          appealId: createdAppeal.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
