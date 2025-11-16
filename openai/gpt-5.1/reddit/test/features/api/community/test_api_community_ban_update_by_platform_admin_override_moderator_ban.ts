import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_community_ban_update_by_platform_admin_override_moderator_ban(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "Password123!",
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register and authenticate a community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@moderator.example.com`,
    password: "Password123!",
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://community.example.com/moderator/join",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 3. Register and authenticate a member user
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: "Password123!",
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As platform admin, ensure we are authenticated as admin (login again for clarity)
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.console.example.com/login",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 5. Platform admin creates an account status (generic active status)
  const accountStatusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(6)}`,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusCreateBody,
      },
    );
  typia.assert(accountStatus);

  // 6. Platform admin creates a visibility level for communities
  const visibilityLevelCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityLevelCreateBody = {
    code: visibilityLevelCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 7. Platform admin creates a platform setting related to ban duration constraints
  const platformSettingCreateBody = {
    key: `ban.max_duration_days.${RandomGenerator.alphabets(4)}`,
    value: "30",
    description: "Maximum ban duration in days for community-level bans.",
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const platformSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: platformSettingCreateBody,
      },
    );
  typia.assert(platformSetting);

  // 8. Platform admin creates a content policy category
  const contentPolicyCode = `harassment_${RandomGenerator.alphabets(4)}`;
  const contentPolicyCreateBody = {
    code: contentPolicyCode,
    name: "Harassment and Bullying",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isActive: true,
    isDefault: true,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const contentPolicyCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: contentPolicyCreateBody,
      },
    );
  typia.assert(contentPolicyCategory);

  // 9. Platform admin creates a report reason category
  const reportReasonCode = `abuse_${RandomGenerator.alphabets(4)}`;
  const reportReasonCreateBody = {
    code: reportReasonCode,
    name: "Abusive Behavior",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reportReasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reportReasonCreateBody,
      },
    );
  typia.assert(reportReasonCategory);

  // 10. Switch to member user account for community creation
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 11. Member user creates a community using the created visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Ban Update",
    description: RandomGenerator.paragraph({ sentences: 6 }),
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

  // 12. Member user creates a membership request for the community
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);

  // 13. Switch to community moderator account to create the initial ban
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://community.example.com/moderator/login",
    referrer: "https://community.example.com/moderator",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLogin);

  // 14. Moderator creates an initial community-level ban for the member user
  const now = new Date();
  const startedAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const initialExpiresAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const moderatorBanCreateBody = {
    memberuser_id: memberAuthorized.id,
    reason: "Initial moderator-issued ban for testing.",
    policy_category: contentPolicyCategory.code,
    started_at: startedAt,
    expires_at: initialExpiresAt,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const moderatorBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: moderatorBanCreateBody,
      },
    );
  typia.assert(moderatorBan);

  // 15. Switch back to platform admin to override/update the ban
  const platformAdminReloginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.console.example.com/login",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminRelogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminReloginBody,
    });
  typia.assert(platformAdminRelogin);

  // 16. Prepare updated ban attributes for override
  const extendedExpiresAt = new Date(
    now.getTime() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const updatedReason =
    "Platform admin override: extended review and adjusted severity.";
  const updatedPolicyCategory = `${contentPolicyCategory.code}.severe`;

  const updateBody = {
    reason: updatedReason,
    policy_category: updatedPolicyCategory,
    expires_at: extendedExpiresAt,
    is_active: false,
  } satisfies ICommunityPlatformCommunityBan.IUpdate;

  const updatedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.update(
      connection,
      {
        communityIdentifier: community.identifier,
        banId: moderatorBan.id,
        body: updateBody,
      },
    );
  typia.assert(updatedBan);

  // 17. Validate that immutable identity fields are preserved
  TestValidator.equals(
    "ban id should remain unchanged after platform admin update",
    updatedBan.id,
    moderatorBan.id,
  );
  TestValidator.equals(
    "community id within ban should remain unchanged",
    updatedBan.community.id,
    moderatorBan.community.id,
  );
  TestValidator.equals(
    "member user id within ban should remain unchanged",
    updatedBan.memberUser.id,
    moderatorBan.memberUser.id,
  );
  TestValidator.equals(
    "ban started_at should remain unchanged",
    updatedBan.started_at,
    moderatorBan.started_at,
  );

  // 18. Validate that updatable fields reflect the override
  TestValidator.equals(
    "ban reason should be updated by platform admin override",
    updatedBan.reason,
    updateBody.reason,
  );
  TestValidator.equals(
    "ban policy_category should be updated to more severe category",
    updatedBan.policy_category,
    updateBody.policy_category,
  );
  TestValidator.equals(
    "ban expires_at should be extended as specified",
    updatedBan.expires_at,
    updateBody.expires_at,
  );
  TestValidator.equals(
    "ban is_active should reflect updated deactivation flag",
    updatedBan.is_active,
    updateBody.is_active,
  );
}
