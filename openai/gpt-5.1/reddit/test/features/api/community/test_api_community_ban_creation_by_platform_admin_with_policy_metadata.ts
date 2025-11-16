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
 * Validate platform-admin-driven community ban creation with policy metadata.
 *
 * Business workflow covered:
 *
 * 1. Platform admin joins (creating admin actor and tokens).
 * 2. Member user joins (target of the ban).
 * 3. Platform admin creates a global account status (master data dependency).
 * 4. Platform admin creates a community visibility level.
 * 5. Member user logs in and creates a community using that visibility level.
 * 6. Platform admin logs back in and creates a platform setting key for bans.
 * 7. Platform admin creates a content policy category and a report reason
 *    category.
 * 8. Platform admin creates a community-level ban for the member user with reason
 *    and policy_category aligned to the created taxonomy.
 * 9. The response ICommunityPlatformCommunityBan is validated and its key
 *    relationships and fields are asserted.
 */
export async function test_api_community_ban_creation_by_platform_admin_with_policy_metadata(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Member user joins (target of ban)
  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    ip: "203.0.113.10",
    href: "https://app.frontend.local/signup",
    referrer: "https://app.frontend.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorized);

  const memberUserId = memberUserAuthorized.id;

  // 3. Platform admin creates account status (master data dependency)
  const accountStatusCreateBody = {
    key: "ACTIVE_TEST_STATUS",
    label: "Active Test Status",
    description: "Status used for testing community bans.",
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

  // 4. Platform admin creates community visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: "Visibility level for E2E community ban tests.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility code should match",
    visibilityLevel.code,
    visibilityCode,
  );

  // 5. Member user logs in and creates a community using the visibility level
  const memberUserLoginBody = {
    identifier: memberUserJoinBody.email,
    password: memberUserJoinBody.password,
    ip: "203.0.113.10",
    href: "https://app.frontend.local/login",
    referrer: "https://app.frontend.local/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberUserLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberUserLoginBody,
    });
  typia.assert(memberUserLoginAuthorized);

  const communityIdentifier = `test-community-${RandomGenerator.alphabets(8)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "E2E Ban Test Community",
    description: RandomGenerator.paragraph({ sentences: 6 }),
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
  TestValidator.equals(
    "community identifier should match",
    community.identifier,
    communityIdentifier,
  );

  // 6. Platform admin logs back in
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 7. Platform admin creates a platform-wide setting (ban-related key)
  const settingKey = `ban.max_duration_days.${RandomGenerator.alphabets(5)}`;
  const platformSettingCreateBody = {
    key: settingKey,
    value: "7",
    description: "Maximum ban duration in days for test scenario.",
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const platformSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      { body: platformSettingCreateBody },
    );
  typia.assert(platformSetting);
  TestValidator.equals(
    "platform setting key should match",
    platformSetting.key,
    settingKey,
  );

  // 8. Platform admin creates a content policy category
  const policyCode = `harassment_${RandomGenerator.alphabets(5)}`;
  const contentPolicyCreateBody = {
    code: policyCode,
    name: "Harassment Test Category",
    description:
      "Content policy category used for testing community bans related to harassment.",
    isActive: true,
    isDefault: false,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const contentPolicyCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      { body: contentPolicyCreateBody },
    );
  typia.assert(contentPolicyCategory);
  TestValidator.equals(
    "content policy code should match",
    contentPolicyCategory.code,
    policyCode,
  );

  // 9. Platform admin creates a report reason category
  const reportReasonCode = `spam_report_${RandomGenerator.alphabets(4)}`;
  const reportReasonCreateBody = {
    code: reportReasonCode,
    name: "Spam Report Test Category",
    description: "Report reason category used for testing bans and reports.",
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reportReasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: reportReasonCreateBody },
    );
  typia.assert(reportReasonCategory);
  TestValidator.equals(
    "report reason code should match",
    reportReasonCategory.code,
    reportReasonCode,
  );

  // 10. Platform admin creates a community-level ban
  const now = new Date();
  const startedAt = now.toISOString() as string & tags.Format<"date-time">;
  const expiresAtDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiresAt = expiresAtDate.toISOString() as string &
    tags.Format<"date-time">;

  const banReason = "User engaged in harassment behavior during test.";

  const banCreateBody = {
    memberuser_id: memberUserId,
    reason: banReason,
    policy_category: policyCode,
    started_at: startedAt,
    expires_at: expiresAt,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const communityBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: banCreateBody,
      },
    );
  typia.assert(communityBan);

  // 11. Business assertions on the created ban
  TestValidator.equals(
    "ban community id should match created community",
    communityBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "ban member user id should match target member",
    communityBan.memberUser.id,
    memberUserId,
  );
  TestValidator.predicate(
    "ban issuedByPlatformAdmin should be present",
    communityBan.issuedByPlatformAdmin !== null &&
      communityBan.issuedByPlatformAdmin !== undefined,
  );
  if (
    communityBan.issuedByPlatformAdmin !== null &&
    communityBan.issuedByPlatformAdmin !== undefined
  ) {
    TestValidator.equals(
      "ban issuedByPlatformAdmin id should match admin id",
      communityBan.issuedByPlatformAdmin.id,
      platformAdminLoginAuthorized.id,
    );
  }

  TestValidator.equals(
    "ban reason should match payload",
    communityBan.reason ?? null,
    banCreateBody.reason ?? null,
  );
  TestValidator.equals(
    "ban policy_category should match payload",
    communityBan.policy_category ?? null,
    banCreateBody.policy_category ?? null,
  );

  TestValidator.equals(
    "ban started_at should match payload",
    communityBan.started_at,
    startedAt,
  );
  TestValidator.equals(
    "ban expires_at should match payload",
    communityBan.expires_at,
    expiresAt,
  );

  TestValidator.predicate(
    "ban should be active",
    communityBan.is_active === true,
  );
}
