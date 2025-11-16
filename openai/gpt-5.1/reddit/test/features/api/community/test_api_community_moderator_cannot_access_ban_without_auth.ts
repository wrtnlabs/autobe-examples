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

export async function test_api_community_moderator_cannot_access_ban_without_auth(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. (Optional but realistic) platform admin login
  const platformAdminLoginBody = {
    identifier: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: platformAdminJoinBody.href,
    referrer: platformAdminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  // 3. Create an account status master row
  const accountStatusCreateBody = {
    key: "ACTIVE_MEMBER_STATUS_" + RandomGenerator.alphaNumeric(8),
    label: "Active Member Status",
    description: "Status allowing login and all normal actions for members.",
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

  // 4. Create a visibility level
  const visibilityCode =
    "public_" + RandomGenerator.alphaNumeric(6).toLowerCase();
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility " + RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 5. Create a platform setting (simple, but satisfies dependency)
  const platformSettingCreateBody = {
    key: "ban.max_duration_days." + RandomGenerator.alphaNumeric(6),
    value: "30",
    description:
      "Maximum number of days for temporary community bans in this test setting.",
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

  // 6. Create a content policy category
  const contentPolicyCode =
    "harassment_" + RandomGenerator.alphaNumeric(6).toLowerCase();
  const contentPolicyCreateBody = {
    code: contentPolicyCode,
    name: "Harassment Test Category",
    description: RandomGenerator.paragraph({ sentences: 6 }),
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

  // 7. Create a report reason category
  const reportReasonCode =
    "spam_" + RandomGenerator.alphaNumeric(6).toLowerCase();
  const reportReasonCreateBody = {
    code: reportReasonCode,
    name: "Spam Test Reason",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 8. Register member user
  const memberJoinBody = {
    username: "member_" + RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 9. Member user login (to make sure session is active)
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: memberJoinBody.href,
    referrer: memberJoinBody.referrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // 10. Member user creates a community
  const communityIdentifier =
    "community_" + RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community " + RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
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

  // 11. Platform admin creates a community ban for the member user
  // (connection is still authenticated as member; switch back to platform admin first)
  const platformAdminReLoginBody = {
    identifier: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: platformAdminJoinBody.href,
    referrer: platformAdminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminReLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminReLoginBody,
    });
  typia.assert(platformAdminReLoginResult);

  const banCreateBody = {
    memberuser_id: memberAuthorized.id,
    reason: "Test ban for unauthorized access scenario",
    policy_category: contentPolicyCategory.code,
    started_at: new Date().toISOString(),
    expires_at: null,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const createdBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: banCreateBody,
      },
    );
  typia.assert(createdBan);

  // Positive control (optional): community moderator can read ban detail when authenticated
  const communityModeratorJoinBody = {
    username: "moderator_" + RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModeratorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(communityModeratorAuthorized);

  const moderatorBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.at(
      connection,
      {
        communityIdentifier: community.identifier,
        banId: createdBan.id,
      },
    );
  typia.assert(moderatorBan);

  // 12. Prepare unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 13. Assert that unauthenticated access to ban detail fails
  await TestValidator.error(
    "unauthenticated moderator ban detail access should fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.bans.at(
        unauthenticatedConnection,
        {
          communityIdentifier: community.identifier,
          banId: createdBan.id,
        },
      );
    },
  );
}
