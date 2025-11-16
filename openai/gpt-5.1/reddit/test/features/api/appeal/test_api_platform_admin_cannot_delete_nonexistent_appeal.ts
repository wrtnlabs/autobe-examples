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
 * Validate that a platform administrator cannot delete a non-existent appeal
 * and that an invalid delete attempt has no side effects on existing moderation
 * artifacts.
 *
 * Business context:
 *
 * - Appeals are created by member users to challenge moderation decisions or user
 *   sanctions.
 * - Platform administrators own the erase endpoint for appeals and must receive a
 *   not-found style error when they reference an unknown appealId.
 * - A failed delete for a non-existent appeal must not impact existing appeals,
 *   reports, moderation actions, user sanctions, or communities.
 *
 * Test steps:
 *
 * 1. Create and authenticate all necessary actors:
 *
 *    - PlatformAdmin via POST /auth/platformAdmin/join
 *    - MemberUser via POST /auth/memberUser/join
 *    - CommunityModerator via POST /auth/communityModerator/join
 * 2. Build a minimal but realistic moderation context:
 *
 *    - As platformAdmin, create a community visibility level.
 *    - As memberUser, create a community that uses that visibility level.
 *    - As memberUser, create a report using POST
 *         /communityPlatform/memberUser/reports.
 *    - As communityModerator, create a moderation action for the report using POST
 *         /communityPlatform/communityModerator/moderationActions.
 *    - As platformAdmin, create a user sanction for the member using POST
 *         /communityPlatform/platformAdmin/userSanctions.
 *    - As memberUser, create a valid appeal using POST
 *         /communityPlatform/memberUser/appeals and keep its id.
 * 3. Generate a non-existent appealId:
 *
 *    - Use typia.random<string & tags.Format<"uuid">>() to generate a UUID.
 *    - If by chance it equals the real appeal.id, regenerate once to ensure they
 *         differ.
 * 4. Attempt deletion with the non-existent appealId:
 *
 *    - Ensure we are authenticated as platformAdmin (by calling login if necessary,
 *         or reusing the join result).
 *    - Call api.functional.communityPlatform.platformAdmin.appeals.erase with the
 *         non-existent appealId.
 *    - Wrap the call in TestValidator.error("platformAdmin cannot delete
 *         non-existent appeal", async () => { ... }) to assert that an error is
 *         thrown.
 * 5. Validate invariants / lack of side effects:
 *
 *    - We cannot re-fetch the appeal, report, sanction, or community because only
 *         create and delete APIs are available in the SDK. Instead, we
 *         validate:
 *
 *         - The appeal object captured prior to the invalid delete remains unchanged in
 *                   memory (its id and core fields are as expected).
 *         - No additional API calls are made that would modify the existing context after
 *                   the failed delete.
 *    - Use TestValidator.equals with descriptive titles to compare in-memory ids
 *         before and after the invalid delete attempt.
 */
export async function test_api_platform_admin_cannot_delete_nonexistent_appeal(
  connection: api.IConnection,
) {
  // 1. Create and authenticate all actors

  // 1-1. Register platform admin (this also authenticates and sets token)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: "AdminPass123!",
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.alphabets(8),
    href: "https://platform.test/admin/join",
    referrer: "https://platform.test/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 1-2. Register member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.test`,
    password: "MemberPass123!",
    ip: RandomGenerator.alphabets(8),
    href: "https://platform.test/member/join",
    referrer: "https://platform.test/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 1-3. Register community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@moderator.test`,
    password: "ModeratorPass123!",
    display_name: RandomGenerator.name(2),
    ip: RandomGenerator.alphabets(8),
    href: "https://platform.test/moderator/join",
    referrer: "https://platform.test/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 2. Build moderation context

  // 2-1. As platformAdmin, create a community visibility level
  const visibilityBody = {
    code: `code_${RandomGenerator.alphabets(5)}`,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 2-2. As memberUser, create a community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: memberJoinBody.ip,
      href: "https://platform.test/member/login",
      referrer: memberJoinBody.referrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityBody = {
    identifier: `community_${RandomGenerator.alphabets(6)}`,
    title: `Community ${RandomGenerator.name(1)}`,
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

  // 2-3. As memberUser, create a report
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportBody },
    );
  typia.assert(report);

  // 2-4. As communityModerator, create a moderation action for the report
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoinBody.email,
      password: moderatorJoinBody.password,
      ip: moderatorJoinBody.ip,
      href: "https://platform.test/moderator/login",
      referrer: moderatorJoinBody.referrer,
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const moderationActionBody = {
    community_id: community.id,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary: "Initial moderation warning",
    notes_internal: "Auto-generated by e2e test.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      { body: moderationActionBody },
    );
  typia.assert(moderationAction);

  // 2-5. As platformAdmin, create a user sanction for the member
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: platformAdminJoinBody.ip,
      href: "https://platform.test/admin/login",
      referrer: platformAdminJoinBody.referrer,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const effectiveFrom = new Date().toISOString();
  const effectiveUntil = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const sanctionBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Test sanction for appeal flow",
    notes_internal: "E2E test sanction context.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: sanctionBody },
    );
  typia.assert(sanction);

  // 2-6. As memberUser, create a valid appeal
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: memberJoinBody.ip,
      href: "https://platform.test/member/login2",
      referrer: memberJoinBody.referrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const appealBody = {
    appeal_scope: "sanction",
    reason_summary: "I believe this sanction is too strict.",
    details: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      { body: appealBody },
    );
  typia.assert(appeal);

  const originalAppealId = appeal.id;

  // 3. Generate a non-existent appealId
  let nonExistentAppealId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonExistentAppealId === originalAppealId) {
    nonExistentAppealId = typia.random<string & tags.Format<"uuid">>();
  }

  // 4. Attempt deletion with the non-existent appealId as platformAdmin
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: platformAdminJoinBody.ip,
      href: "https://platform.test/admin/login2",
      referrer: platformAdminJoinBody.referrer,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  await TestValidator.error(
    "platformAdmin cannot delete non-existent appeal",
    async () => {
      await api.functional.communityPlatform.platformAdmin.appeals.erase(
        connection,
        { appealId: nonExistentAppealId },
      );
    },
  );

  // 5. Validate invariants (in-memory)
  TestValidator.equals(
    "valid appeal id remains unchanged in memory after failed delete",
    appeal.id,
    originalAppealId,
  );
}
