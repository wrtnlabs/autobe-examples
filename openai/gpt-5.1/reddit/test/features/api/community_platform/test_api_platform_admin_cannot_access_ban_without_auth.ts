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

/**
 * Verify that unauthenticated callers cannot access platform-admin ban details.
 *
 * Business goal: Ensure that GET
 * /communityPlatform/platformAdmin/communities/{communityIdentifier}/bans/{banId}
 * cannot be called anonymously and that a ban detail is only retrievable when a
 * valid platformAdmin session exists. This guards sensitive moderation data
 * such as ban reasons, policy categories, and banned member identity.
 *
 * End-to-end flow:
 *
 * 1. Seed authentication actors and master data under proper authorization:
 *
 *    - Create a platform admin (join) to own platform settings and master data.
 *    - As platformAdmin, create an account status, platform setting, content policy
 *         category, report reason category, and a community visibility level.
 * 2. Create a member user and a community:
 *
 *    - Register a memberUser via /auth/memberUser/join.
 *    - As that memberUser, create a community using the visibility level code.
 * 3. Create a community moderator and a ban:
 *
 *    - Register and login a communityModerator.
 *    - As communityModerator, create a ban in the community targeting the
 *         memberUser.
 * 4. Attempt platformAdmin ban detail access without auth:
 *
 *    - Clone the provided connection into an unauthenticated connection with
 *         headers: {} so no Authorization header is sent.
 *    - Call platformAdmin ban detail endpoint using the real community identifier
 *         and ban id, expecting the call to fail.
 * 5. Assertions:
 *
 *    - Use typia.assert on all successful responses (join, master-data create,
 *         community create, ban create) to ensure type correctness.
 *    - Use TestValidator.error with an async closure around the unauthenticated GET
 *         call to assert that it throws (indicating authentication is
 *         required). Do not check HTTP status codes or error payloads.
 */
export async function test_api_platform_admin_cannot_access_ban_without_auth(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (authenticated actor for platform-level seeding)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Seed platform-level master data under platformAdmin session
  const accountStatusBody = {
    key: "ACTIVE_MEMBER",
    label: "Active Member",
    description: "Default active account status for community users",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusBody },
    );
  typia.assert(accountStatus);

  const platformSettingBody = {
    key: "ban.max_duration_days",
    value: "30",
    description:
      "Maximum allowed duration in days for temporary community bans",
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const platformSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      { body: platformSettingBody },
    );
  typia.assert(platformSetting);

  const contentPolicyCategoryBody = {
    code: "harassment",
    name: "Harassment and Bullying",
    description:
      "Content that targets individuals with abusive or harassing behavior.",
    isActive: true,
    isDefault: true,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const contentPolicyCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      { body: contentPolicyCategoryBody },
    );
  typia.assert(contentPolicyCategory);

  const reportReasonCategoryBody = {
    code: "spam",
    name: "Spam",
    description:
      "Unsolicited or repetitive content not relevant to the community.",
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reportReasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: reportReasonCategoryBody },
    );
  typia.assert(reportReasonCategory);

  const visibilityLevelBody = {
    code: "public",
    name: "Public",
    description: "Community is discoverable and readable by all users.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelBody },
    );
  typia.assert(visibilityLevel);

  // 3. Member user joins and creates a community
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUserAuth);

  const communityIdentifier = RandomGenerator.alphabets(8);
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 4. Community moderator joins and logs in
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuth);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuth);

  // 5. Community moderator creates a ban for the member user in this community
  const startedAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const banCreateBody = {
    memberuser_id: memberUserAuth.id,
    reason: "Repeated spam posts despite warnings.",
    policy_category: contentPolicyCategory.code,
    started_at: startedAt,
    expires_at: expiresAt,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const ban: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: banCreateBody,
      },
    );
  typia.assert(ban);

  // Sanity check: ban belongs to expected community and member
  TestValidator.equals(
    "ban community id matches created community",
    ban.community.id,
    community.id,
  );
  TestValidator.equals(
    "ban member id matches banned member",
    ban.memberUser.id,
    memberUserAuth.id,
  );

  // 6. Prepare an unauthenticated connection by clearing headers on a clone
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Attempt to access platform-admin ban detail endpoint without auth
  await TestValidator.error(
    "platformAdmin ban detail endpoint requires authentication",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.bans.at(
        unauthenticatedConnection,
        {
          communityIdentifier: community.identifier,
          banId: ban.id,
        },
      );
    },
  );
}
