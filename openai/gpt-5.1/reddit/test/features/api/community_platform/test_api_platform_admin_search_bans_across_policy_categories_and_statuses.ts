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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";

export async function test_api_platform_admin_search_bans_across_policy_categories_and_statuses(
  connection: api.IConnection,
) {
  // 1. Register and implicitly authenticate a platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create master data
  // 2-1. Visibility level
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelBody = {
    code: visibilityCode,
    name: "Public community",
    description: "Publicly visible community for everyone",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  // 2-2. Account status master (simple active status)
  const accountStatusKey = `ACTIVE_${RandomGenerator.alphaNumeric(6)}`;
  const accountStatusBody = {
    key: accountStatusKey,
    label: "Active",
    description: "Active account status for test member users",
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

  // 2-3. Platform setting
  const platformSettingKey = `ban_test_setting_${RandomGenerator.alphaNumeric(6)}`;
  const platformSettingBody = {
    key: platformSettingKey,
    value: "true",
    description: "Dummy platform setting for ban search test",
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

  // 2-4. Content policy categories: harassment, spam
  const harassmentCode = `harassment_${RandomGenerator.alphaNumeric(6)}`;
  const spamCode = `spam_${RandomGenerator.alphaNumeric(6)}`;

  const harassmentCategoryBody = {
    code: harassmentCode,
    name: "Harassment",
    description: "Harassment and bullying content policy category",
    isActive: true,
    isDefault: true,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const harassmentCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: harassmentCategoryBody,
      },
    );
  typia.assert(harassmentCategory);

  const spamCategoryBody = {
    code: spamCode,
    name: "Spam",
    description: "Spam and unsolicited promotion category",
    isActive: true,
    isDefault: true,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const spamCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: spamCategoryBody,
      },
    );
  typia.assert(spamCategory);

  // 2-5. Report reason category (dependency only)
  const reportReasonCode = `generic_reason_${RandomGenerator.alphaNumeric(6)}`;
  const reportReasonBody = {
    code: reportReasonCode,
    name: "Generic reason",
    description: "Generic report reason for ban scenarios",
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

  // 3. Register a member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.local/join",
    referrer: "https://app.local/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create a community
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Ban Search Test Community",
    description: "Community used to validate ban search filters.",
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

  // 5. Switch back to platform admin via login to ensure platformAdmin context
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 6. Create bans in the community
  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
  const earlierPast = new Date(now.getTime() - 1000 * 60 * 120); // 2 hours ago

  // Ban 1: active harassment ban
  const ban1Body = {
    memberuser_id: memberAuthorized.id,
    reason: "Active harassment ban",
    policy_category: harassmentCode,
    started_at: now.toISOString(),
    expires_at: null,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const ban1: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: ban1Body,
      },
    );
  typia.assert(ban1);

  // Ban 2: active spam ban
  const ban2Body = {
    memberuser_id: memberAuthorized.id,
    reason: "Active spam ban",
    policy_category: spamCode,
    started_at: now.toISOString(),
    expires_at: null,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const ban2: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: ban2Body,
      },
    );
  typia.assert(ban2);

  // Ban 3: harassment ban that should be inactive (expired in the past)
  const ban3Body = {
    memberuser_id: memberAuthorized.id,
    reason: "Expired harassment ban",
    policy_category: harassmentCode,
    started_at: earlierPast.toISOString(),
    expires_at: past.toISOString(),
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const ban3: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: ban3Body,
      },
    );
  typia.assert(ban3);

  // 7. Search active harassment bans (expect ban1 only by policy_category and is_active)
  const activeHarassmentRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    is_active: true,
    started_from: null,
    started_to: null,
    expires_from: null,
    expires_to: null,
    policy_category: harassmentCode,
  } satisfies ICommunityPlatformCommunityBan.IRequest;

  const activeHarassmentPage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.bans.index(
      connection,
      {
        communityIdentifier: community.identifier,
        body: activeHarassmentRequest,
      },
    );
  typia.assert(activeHarassmentPage);

  const activeHarassmentData = activeHarassmentPage.data;

  // Ensure at least one result
  TestValidator.predicate(
    "active harassment search should return at least one ban",
    activeHarassmentData.length > 0,
  );

  // Every result must be active and harassment category
  for (const summary of activeHarassmentData) {
    TestValidator.predicate(
      "each returned ban for active harassment filter is active",
      summary.is_active === true,
    );
    TestValidator.equals(
      "each returned ban for active harassment filter has harassment policy_category",
      summary.policy_category ?? null,
      harassmentCode,
    );
  }

  // At least one result should match ban1 id
  const hasBan1 = activeHarassmentData.some((s) => s.id === ban1.id);
  TestValidator.predicate(
    "active harassment results should include ban1",
    hasBan1,
  );

  // No spam policy_category in results
  const hasSpamInActiveHarassment = activeHarassmentData.some(
    (s) => s.policy_category === spamCode,
  );
  TestValidator.predicate(
    "active harassment results should not include spam policy_category",
    hasSpamInActiveHarassment === false,
  );

  // 8. Search inactive harassment bans (expect ban3 only)
  const inactiveHarassmentRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    is_active: false,
    started_from: null,
    started_to: null,
    expires_from: null,
    expires_to: null,
    policy_category: harassmentCode,
  } satisfies ICommunityPlatformCommunityBan.IRequest;

  const inactiveHarassmentPage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.bans.index(
      connection,
      {
        communityIdentifier: community.identifier,
        body: inactiveHarassmentRequest,
      },
    );
  typia.assert(inactiveHarassmentPage);

  const inactiveHarassmentData = inactiveHarassmentPage.data;

  // Ensure at least one result for inactive harassment (ban3)
  TestValidator.predicate(
    "inactive harassment search should return at least one ban",
    inactiveHarassmentData.length > 0,
  );

  for (const summary of inactiveHarassmentData) {
    TestValidator.predicate(
      "each returned ban for inactive harassment filter is inactive",
      summary.is_active === false,
    );
    TestValidator.equals(
      "each returned ban for inactive harassment filter has harassment policy_category",
      summary.policy_category ?? null,
      harassmentCode,
    );
  }

  const hasBan3 = inactiveHarassmentData.some((s) => s.id === ban3.id);
  TestValidator.predicate(
    "inactive harassment results should include ban3",
    hasBan3,
  );

  const hasSpamInInactiveHarassment = inactiveHarassmentData.some(
    (s) => s.policy_category === spamCode,
  );
  TestValidator.predicate(
    "inactive harassment results should not include spam policy_category",
    hasSpamInInactiveHarassment === false,
  );

  // 9. Basic pagination sanity checks (non-negative counts)
  const paginations: IPage.IPagination[] = [
    activeHarassmentPage.pagination,
    inactiveHarassmentPage.pagination,
  ];

  for (const pagination of paginations) {
    TestValidator.predicate(
      "pagination current page is non-negative",
      pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit is non-negative",
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records is non-negative",
      pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is non-negative",
      pagination.pages >= 0,
    );
  }
}
