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

export async function test_api_community_ban_update_by_platform_admin_lift_ban(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin (join implicitly authenticates)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://admin.console.local/register",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Register a member user who will be banned
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://app.local/signup",
    referrer: "https://app.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUserAuthorized);

  // 3. As platform admin, create an account status (simple active-like status)
  const accountStatusCreateBody = {
    key: "ACTIVE_MEMBER_STATUS",
    label: "Active Member",
    description: "Active member status allowing login, posting, and voting.",
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

  // 4. As platform admin, create a community visibility level
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(5)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: "Publicly visible community that anyone can discover.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 5. As platform admin, create a platform setting to represent a ban policy
  const platformSettingCreateBody = {
    key: `ban.policy.${RandomGenerator.alphaNumeric(6)}`,
    value: '{"maxBanDays":30}',
    description:
      "Example platform setting defining max ban duration used in tests.",
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

  // 6. As platform admin, create content policy and report reason categories
  const contentPolicyCode = `policy_${RandomGenerator.alphaNumeric(6)}`;
  const contentPolicyCreateBody = {
    code: contentPolicyCode,
    name: "Harassment",
    description: "Harassment and bullying policy category for bans.",
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

  const reportReasonCode = `reason_${RandomGenerator.alphaNumeric(6)}`;
  const reportReasonCreateBody = {
    code: reportReasonCode,
    name: "Harassment report",
    description: "Report reason used for harassment-related bans.",
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

  // 7. Switch to member user and create a community referencing visibility level
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: memberJoinBody.ip,
      href: memberJoinBody.href,
      referrer: memberJoinBody.referrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Ban Workflow",
    description: RandomGenerator.paragraph({ sentences: 8 }),
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

  // 8. As the member user, submit a membership request to create realistic context
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 9. Switch back to platform admin (login again to ensure actor context)
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: platformAdminJoinBody.ip,
      href: platformAdminJoinBody.href,
      referrer: platformAdminJoinBody.referrer,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  // 10. Create an active community ban targeting the member user
  const now = new Date();
  const startedAtIso = now.toISOString();
  const expiresAtIso = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const banCreateBody = {
    memberuser_id: memberUserAuthorized.id,
    reason: `Initial ban due to policy ${contentPolicyCategory.code} and report reason ${reportReasonCategory.code}.`,
    policy_category: contentPolicyCategory.code,
    started_at: startedAtIso,
    expires_at: expiresAtIso,
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

  TestValidator.predicate(
    "created ban should be active before lifting",
    createdBan.is_active === true,
  );
  TestValidator.equals(
    "ban community and member associations must match context",
    createdBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "ban target member must match the member user we created",
    createdBan.memberUser.id,
    memberUserAuthorized.id,
  );

  const originalBanId = createdBan.id;
  const originalStartedAt = createdBan.started_at;

  // 11. Lift the ban by deactivating it via the update endpoint
  const liftedReason = `${banCreateBody.reason ?? "Initial ban"} - lifted by platform admin.`;

  const banUpdateBody = {
    reason: liftedReason,
    policy_category: createdBan.policy_category,
    expires_at: createdBan.expires_at,
    is_active: false,
  } satisfies ICommunityPlatformCommunityBan.IUpdate;

  const updatedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.update(
      connection,
      {
        communityIdentifier: community.identifier,
        banId: originalBanId,
        body: banUpdateBody,
      },
    );
  typia.assert(updatedBan);

  // 12. Assertions: ban should be deactivated but preserved
  TestValidator.equals(
    "ban id should remain unchanged after lifting",
    updatedBan.id,
    originalBanId,
  );
  TestValidator.equals(
    "ban community linkage must remain unchanged",
    updatedBan.community.id,
    createdBan.community.id,
  );
  TestValidator.equals(
    "ban target member linkage must remain unchanged",
    updatedBan.memberUser.id,
    createdBan.memberUser.id,
  );
  TestValidator.equals(
    "ban started_at timestamp should remain unchanged after lifting",
    updatedBan.started_at,
    originalStartedAt,
  );
  TestValidator.predicate(
    "ban should be inactive (lifted) after update",
    updatedBan.is_active === false,
  );

  TestValidator.equals(
    "lifted ban reason should be updated to include lifting note",
    updatedBan.reason,
    liftedReason,
  );

  TestValidator.equals(
    "ban record must remain not soft-deleted after lifting",
    updatedBan.deleted_at ?? null,
    null,
  );
}
