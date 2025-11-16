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

/**
 * Validate that a platform administrator can reclassify and extend a
 * community-level ban while respecting platform-level configuration, and that
 * the returned ban reflects the updated policy category and expiry without
 * changing identity fields.
 *
 * Business flow (positive path only, as negative-path HTTP status checking is
 * out of scope):
 *
 * 1. Platform admin joins (self-registration) and becomes authenticated.
 * 2. Member user joins and becomes authenticated.
 * 3. As platform admin, create an account status (for completeness of master
 *    data).
 * 4. As platform admin, create a community visibility level that member will use.
 * 5. As platform admin, create a platform setting that conceptually constrains ban
 *    duration (the enforcement is internal; test just seeds a realistic setting
 *    row).
 * 6. As platform admin, create two content policy categories (e.g., spam and
 *    hate_speech).
 * 7. As platform admin, create a report reason category for alignment with policy
 *    taxonomy.
 * 8. Switch to member user and create a community using the previously created
 *    visibility level.
 * 9. Still as member user, create a membership-request for that community.
 * 10. Switch back to platform admin and create an initial temporary community-level
 *     ban targeting the member user with a near-future expires_at and the
 *     lower-severity policy_category.
 * 11. As platform admin, call the update endpoint to extend expires_at (still
 *     within a short, realistic window) and promote policy_category to the
 *     higher-severity category; assert that this update succeeds.
 * 12. Verify that the returned ban preserves id and community/member linkage and
 *     started_at, while reflecting the new policy_category, updated reason, and
 *     later expires_at and leaving is_active true.
 */
export async function test_api_community_ban_update_by_platform_admin_policy_reclassification_and_duration_enforcement(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and becomes authenticated
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Member user joins and becomes authenticated
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://community.app.local/signup",
    referrer: "https://community.app.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As platform admin, create an account status
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.console.local/login",
      referrer: "https://admin.console.local/landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const statusCreateBody = {
    key: "ACTIVE",
    label: "Active",
    description: "Active account status for fully enabled actors.",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert(accountStatus);

  // 4. As platform admin, create a community visibility level
  const visibilityCode = "public_visibility_" + RandomGenerator.alphabets(8);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 5. As platform admin, create a platform setting that conceptually constrains ban duration
  const platformSettingKey = "ban.max_temporary_duration_days";
  const platformSettingCreateBody = {
    key: platformSettingKey,
    value: "30", // conceptually: 30 days maximum; exact interpretation is internal
    description:
      "Maximum temporary ban duration in days for community-level bans.",
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

  // 6. As platform admin, create multiple content policy categories
  const lowSeverityCode = "spam_" + RandomGenerator.alphabets(6);
  const highSeverityCode = "hate_speech_" + RandomGenerator.alphabets(6);

  const lowSeverityCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: {
          code: lowSeverityCode,
          name: "Spam",
          description: "Low severity spam and unsolicited content.",
          isActive: true,
          isDefault: true,
        } satisfies ICommunityPlatformContentPolicyCategory.ICreate,
      },
    );
  typia.assert(lowSeverityCategory);

  const highSeverityCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: {
          code: highSeverityCode,
          name: "Hate Speech",
          description: "High severity hateful or violent content.",
          isActive: true,
          isDefault: true,
        } satisfies ICommunityPlatformContentPolicyCategory.ICreate,
      },
    );
  typia.assert(highSeverityCategory);

  // 7. As platform admin, create a report reason category
  const reportReasonCode = "abuse_" + RandomGenerator.alphabets(6);
  const reportReason: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: {
          code: reportReasonCode,
          name: "Abusive behaviour",
          description: "Reports related to abusive or harassing behaviour.",
          is_user_visible: true,
          is_active: true,
        } satisfies ICommunityPlatformReportReasonCategory.ICreate,
      },
    );
  typia.assert(reportReason);

  // 8. Switch to member user and create a community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: null,
      href: "https://community.app.local/login",
      referrer: "https://community.app.local/home",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Ban Update",
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

  // 9. Member user creates a membership request for that community
  const membershipRequestBody = {
    questionKey: "motivation",
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

  // 10. Switch back to platform admin and create an initial temporary ban
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.console.local/login",
      referrer: "https://admin.console.local/landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const now = new Date();
  const startedAt = new Date(now.getTime()).toISOString();
  const expiresSoon = new Date(
    now.getTime() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const initialBanBody = {
    memberuser_id: memberAuthorized.id,
    reason: "Initial temporary ban for low-severity spam.",
    policy_category: lowSeverityCategory.code,
    started_at: startedAt,
    expires_at: expiresSoon,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const initialBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: initialBanBody,
      },
    );
  typia.assert(initialBan);

  TestValidator.equals(
    "initial ban should have low-severity policy category",
    initialBan.policy_category,
    lowSeverityCategory.code,
  );
  TestValidator.equals(
    "initial ban community id should match created community id",
    initialBan.community.id,
    community.id,
  );

  // 11. Platform admin updates the ban to extend expires_at and promote policy_category
  const extendedExpires = new Date(
    now.getTime() + 10 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const updateBody = {
    reason: "Escalated ban after further review and reports.",
    policy_category: highSeverityCategory.code,
    expires_at: extendedExpires,
    is_active: true,
  } satisfies ICommunityPlatformCommunityBan.IUpdate;

  const updatedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.update(
      connection,
      {
        communityIdentifier: community.identifier,
        banId: initialBan.id,
        body: updateBody,
      },
    );
  typia.assert(updatedBan);

  // 12. Validate that identity fields and started_at are preserved, and updates are applied
  TestValidator.equals(
    "ban id should remain unchanged after update",
    updatedBan.id,
    initialBan.id,
  );
  TestValidator.equals(
    "banned member should remain the same",
    updatedBan.memberUser.id,
    initialBan.memberUser.id,
  );
  TestValidator.equals(
    "community of ban should remain the same",
    updatedBan.community.id,
    initialBan.community.id,
  );
  TestValidator.equals(
    "community id in ban should match created community id",
    updatedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "started_at should remain unchanged after update",
    updatedBan.started_at,
    initialBan.started_at,
  );
  TestValidator.equals(
    "policy_category should be updated to the higher severity code",
    updatedBan.policy_category,
    highSeverityCategory.code,
  );
  TestValidator.equals(
    "expires_at should be extended compared to initial ban",
    updatedBan.expires_at,
    extendedExpires,
  );
  TestValidator.predicate(
    "updated ban must remain active",
    updatedBan.is_active === true,
  );
}
