import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_platform_admin_views_ban_detail_for_community(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join)
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create an account status definition
  const accountStatusCreateBody = {
    key: "ACTIVE_MEMBER",
    label: "Active Member",
    description: "Default active member status for tests",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusCreateBody },
    );
  typia.assert(accountStatus);

  // 3. As platform admin, create a visibility level
  const visibilityCode = "public-visible-" + RandomGenerator.alphaNumeric(8);
  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: "Public Visible (E2E)",
    description: "Visibility level for test communities allowing public access",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelCreateBody },
    );
  typia.assert(visibilityLevel);

  // 4. As platform admin, create a platform setting relevant to bans
  const platformSettingCreateBody = {
    key: "ban.max_duration_days",
    value: "30",
    description: "Maximum temporary ban duration in days for community bans",
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const platformSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      { body: platformSettingCreateBody },
    );
  typia.assert(platformSetting);

  // 5. As platform admin, create a content policy category
  const policyCode = "harassment-" + RandomGenerator.alphaNumeric(6);
  const contentPolicyCreateBody = {
    code: policyCode,
    name: "Harassment (E2E)",
    description: "E2E test content policy category for harassment",
    isActive: true,
    isDefault: true,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const contentPolicyCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      { body: contentPolicyCreateBody },
    );
  typia.assert(contentPolicyCategory);

  // 6. As platform admin, create a report reason category
  const reportReasonCode =
    "harassment_personal_attack_" + RandomGenerator.alphaNumeric(6);
  const reportReasonCreateBody = {
    code: reportReasonCode,
    name: "Harassment / Personal attack (E2E)",
    description: "E2E test report reason category",
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reportReasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: reportReasonCreateBody },
    );
  typia.assert(reportReasonCategory);

  // 7. Register a member user to act as community creator and ban target
  const memberUserEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUserPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: "member_" + RandomGenerator.alphaNumeric(8),
    email: memberUserEmail,
    password: memberUserPassword,
    ip: "192.168.0.10",
    href: "https://app.community.local/signup",
    referrer: "https://app.community.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const bannedMemberId = memberAuthorized.id;

  // 8. As member user, create a community
  const communityIdentifierBase =
    "test-ban-community-" + RandomGenerator.alphaNumeric(8);
  const communityCreateBody = {
    identifier: communityIdentifierBase,
    title: "Test Ban Community (E2E)",
    description: "Community used to test platform admin ban detail views.",
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  const communityIdentifier = community.identifier;

  // 9. Register a community moderator who will issue the ban
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = RandomGenerator.alphaNumeric(12);

  const moderatorJoinBody = {
    username: "mod_" + RandomGenerator.alphaNumeric(8),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: "E2E Moderator",
    ip: "10.0.0.5",
    href: "https://mod.console.local/join",
    referrer: "https://mod.console.local/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 10. As community moderator, create a community-level ban
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const banCreateBody = {
    memberuser_id: bannedMemberId,
    reason: "E2E test ban for harassment scenario.",
    policy_category: policyCode,
    started_at: now.toISOString(),
    expires_at: expires.toISOString(),
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const createdBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier,
        body: banCreateBody,
      },
    );
  typia.assert(createdBan);

  const banId = createdBan.id;

  // 11. Switch back to platform admin context via login
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminPassword,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 12. As platform admin, retrieve detailed ban info
  const banDetail: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.at(
      connection,
      {
        communityIdentifier,
        banId: banId,
      },
    );
  typia.assert(banDetail);

  // 13. Business logic validations

  // Community associations should match
  TestValidator.equals(
    "ban detail community id matches created community",
    banDetail.community.id,
    community.id,
  );

  TestValidator.predicate(
    "ban detail community slug/name are non-empty",
    banDetail.community.slug.length > 0 && banDetail.community.name.length > 0,
  );

  // MemberUser association should match banned member
  TestValidator.equals(
    "ban detail member user id matches banned member id",
    banDetail.memberUser.id,
    bannedMemberId,
  );

  // Issuing actor: for this scenario, expect community moderator to be present
  TestValidator.predicate(
    "ban detail has issuing actor (community moderator or platform admin)",
    (banDetail.issuedByCommunityModerator !== undefined &&
      banDetail.issuedByCommunityModerator !== null) ||
      (banDetail.issuedByPlatformAdmin !== undefined &&
        banDetail.issuedByPlatformAdmin !== null),
  );

  TestValidator.predicate(
    "ban issued by community moderator in this scenario",
    banDetail.issuedByCommunityModerator !== undefined &&
      banDetail.issuedByCommunityModerator !== null,
  );

  // is_active consistency: if expires_at is in the future, expect is_active true
  const parsedStartedAt = new Date(banDetail.started_at);
  const parsedExpiresAt = banDetail.expires_at
    ? new Date(banDetail.expires_at)
    : null;
  const nowAfterRead = new Date();

  if (parsedExpiresAt !== null) {
    const inWindow =
      parsedStartedAt.getTime() <= nowAfterRead.getTime() &&
      nowAfterRead.getTime() <= parsedExpiresAt.getTime();

    if (inWindow) {
      TestValidator.predicate(
        "ban is active when current time is within started_at and expires_at",
        banDetail.is_active === true,
      );
    }
  }

  // deleted_at should be null for an active ban in this scenario
  TestValidator.predicate(
    "ban is not soft-deleted (deleted_at is null)",
    banDetail.deleted_at === null || banDetail.deleted_at === undefined,
  );

  // policy_category echo check
  TestValidator.equals(
    "ban detail policy_category matches created policy code",
    banDetail.policy_category,
    banCreateBody.policy_category,
  );
}
