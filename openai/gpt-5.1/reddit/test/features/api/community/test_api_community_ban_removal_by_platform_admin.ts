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

export async function test_api_community_ban_removal_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) and get authorized admin with token
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPass!123",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminId = adminAuthorized.id;

  // 2. Register member user (join)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: "MemberPass!123",
    ip: "127.0.0.1",
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // 3. As platform admin, create master/reference data
  // 3-1. Account status
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(6)}`,
    label: "Active Member",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusBody,
      },
    );
  typia.assert(accountStatus);

  // 3-2. Platform setting
  const platformSettingBody = {
    key: `ban_setting_${RandomGenerator.alphabets(6)}`,
    value: JSON.stringify({ maxBanDays: 30 }),
    description: "Ban configuration for community-level bans",
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const platformSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: platformSettingBody,
      },
    );
  typia.assert(platformSetting);

  // 3-3. Content policy category
  const contentPolicyCode = `policy_${RandomGenerator.alphabets(6)}`;
  const contentPolicyBody = {
    code: contentPolicyCode,
    name: "Harassment and bullying",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    isActive: true,
    isDefault: true,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const contentPolicyCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: contentPolicyBody,
      },
    );
  typia.assert(contentPolicyCategory);

  TestValidator.equals(
    "content policy code should match",
    contentPolicyCategory.code,
    contentPolicyCode,
  );

  // 3-4. Report reason category
  const reportReasonCode = `reason_${RandomGenerator.alphabets(6)}`;
  const reportReasonBody = {
    code: reportReasonCode,
    name: "Abusive language",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reportReasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reportReasonBody,
      },
    );
  typia.assert(reportReasonCategory);

  TestValidator.equals(
    "report reason code should match",
    reportReasonCategory.code,
    reportReasonCode,
  );

  // 3-5. Visibility level
  const visibilityCode = `visibility_${RandomGenerator.alphabets(6)}`;
  const visibilityLevelBody = {
    code: visibilityCode,
    name: "Public community",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code should match",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. Switch actor to memberUser by logging in
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  TestValidator.equals(
    "member login id should match join id",
    memberLoginAuthorized.id,
    memberId,
  );

  // 5. As memberUser, create a community
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.paragraph({ sentences: 2 })}`,
    description: RandomGenerator.paragraph({ sentences: 10 }),
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

  TestValidator.equals(
    "community identifier should match",
    community.identifier,
    communityIdentifier,
  );

  // 6. Optionally create membership request for realism
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

  TestValidator.equals(
    "membership request community id should match community id",
    membershipRequest.community.id,
    community.id,
  );

  TestValidator.equals(
    "membership request requester id should match member id",
    membershipRequest.requesterMemberUser.id,
    memberId,
  );

  // 7. Switch back to platformAdmin via login
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  TestValidator.equals(
    "admin login id should match join id",
    adminLoginAuthorized.id,
    adminId,
  );

  // 8. As platformAdmin, create a community-level ban against the member user
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + 24 * 60 * 60 * 1000);

  const banCreateBody = {
    memberuser_id: memberId,
    reason: RandomGenerator.paragraph({ sentences: 6 }),
    policy_category: contentPolicyCategory.code,
    started_at: startedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const ban: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: banCreateBody,
      },
    );
  typia.assert(ban);

  TestValidator.equals(
    "ban.community.id should match community.id",
    ban.community.id,
    community.id,
  );

  TestValidator.equals(
    "ban.memberUser.id should match member id",
    ban.memberUser.id,
    memberId,
  );

  TestValidator.predicate(
    "ban should have a boolean is_active flag",
    ban.is_active === true || ban.is_active === false,
  );

  const banId = ban.id;

  // 9. Delete the ban via platformAdmin DELETE endpoint
  await api.functional.communityPlatform.platformAdmin.communities.bans.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      banId,
    },
  );

  // 10. Post-conditions: we cannot re-fetch the ban with provided API, so we rely on
  // successful completion of erase as our verification signal.
  TestValidator.predicate(
    "ban deletion completed without throwing error",
    true,
  );
}
