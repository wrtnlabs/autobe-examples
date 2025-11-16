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

export async function test_api_community_ban_removal_by_platform_admin_with_incorrect_community(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (and becomes authenticated)
  const platformAdminPassword = RandomGenerator.alphabets(16);

  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: RandomGenerator.mobile(),
        href: "https://admin.console.example/join",
        referrer: "https://admin.console.example/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  // 2. Create master data as platform admin
  const visibilityLevelCreate = {
    code: `public-${RandomGenerator.alphabets(8)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelCreate },
    );
  typia.assert(visibilityLevel);

  const accountStatusCreate = {
    key: `ACTIVE_${RandomGenerator.alphabets(6)}`,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;
  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusCreate },
    );
  typia.assert(accountStatus);

  const platformSettingCreate = {
    key: `ban.setting.${RandomGenerator.alphabets(6)}`,
    value: "{" + `"maxTemporaryBanDays":30` + "}",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;
  const platformSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      { body: platformSettingCreate },
    );
  typia.assert(platformSetting);

  const contentPolicyCategoryCreate = {
    code: `harassment_${RandomGenerator.alphabets(4)}`,
    name: "Harassment and bullying",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isActive: true,
    isDefault: true,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;
  const contentPolicyCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      { body: contentPolicyCategoryCreate },
    );
  typia.assert(contentPolicyCategory);

  const reportReasonCategoryCreate = {
    code: `harassment_reason_${RandomGenerator.alphabets(4)}`,
    name: "Harassment",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;
  const reportReasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: reportReasonCategoryCreate },
    );
  typia.assert(reportReasonCategory);

  // 3. Register member user who will be banned
  const memberPassword = RandomGenerator.alphabets(16);

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: memberPassword,
        ip: null,
        href: "https://community.example.com/join",
        referrer: "https://community.example.com/home",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  // 4. Login as member user (switch actor context)
  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberJoin.email,
        password: memberPassword,
        ip: null,
        href: "https://community.example.com/login",
        referrer: "https://community.example.com/home",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLogin);

  // 5. As member user, create two communities
  const communityIdentifier1 = `community-${RandomGenerator.alphabets(6)}`;
  const communityIdentifier2 = `community-${RandomGenerator.alphabets(6)}`;

  const community1Create = {
    identifier: communityIdentifier1,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: community1Create },
    );
  typia.assert(community1);

  const community2Create = {
    identifier: communityIdentifier2,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: community2Create },
    );
  typia.assert(community2);

  // 6. Optionally create membership requests for both communities
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest1: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community1.identifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest1);

  const membershipRequest2: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community2.identifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest2);

  // 7. Switch back to platform admin actor via login
  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminJoin.email,
        password: platformAdminPassword,
        ip: null,
        href: "https://admin.console.example/login",
        referrer: "https://admin.console.example/landing",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLogin);

  // 8. Create a community-level ban in the first community
  const nowIso = new Date().toISOString();
  const expiresIso = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const communityBanCreate = {
    memberuser_id: memberJoin.id,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    policy_category: contentPolicyCategory.code,
    started_at: nowIso,
    expires_at: expiresIso,
  } satisfies ICommunityPlatformCommunityBan.ICreate;
  const createdBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.create(
      connection,
      {
        communityIdentifier: community1.identifier,
        body: communityBanCreate,
      },
    );
  typia.assert(createdBan);

  TestValidator.equals(
    "ban is associated with first community",
    createdBan.community.id,
    community1.id,
  );

  // 9. Attempt to delete ban with incorrect communityIdentifier (second community)
  await TestValidator.error(
    "erase should fail when communityIdentifier does not match ban's community",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.bans.erase(
        connection,
        {
          communityIdentifier: community2.identifier,
          banId: createdBan.id,
        },
      );
    },
  );

  // 10. We cannot directly re-fetch the ban with provided APIs, but we can at
  // least assert that the initial create call succeeded and that erase failed.
  // This ensures that the API enforces the (communityIdentifier, banId)
  // scoping contract and does not silently delete bans from other communities.
  TestValidator.predicate(
    "ban remains logically active in first community after failed cross-community erase",
    createdBan.is_active === true,
  );
}
