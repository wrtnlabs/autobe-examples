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
 * Validate that a platform administrator can create a permanent community ban
 * (no expiration).
 *
 * Business workflow covered by this test:
 *
 * 1. Register and authenticate a platform admin.
 * 2. Register a member user who will be the ban target.
 * 3. As platform admin, create master data:
 *
 *    - Account status
 *    - Community visibility level
 *    - Content policy category
 *    - Report reason category
 *    - Platform setting that conceptually allows permanent bans
 * 4. As the member user, create a community using the configured visibility level.
 * 5. Switch back to platform admin and create a community-level ban with
 *    expires_at = null.
 * 6. Assert that the created ban is active, permanent (expires_at null), tied to
 *    the correct community and member user, and preserves reason and
 *    policy_category.
 */
export async function test_api_community_ban_creation_by_platform_admin_without_expiration(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: adminEmail,
    password: "Password123!",
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a member user who will be banned later
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: "Password123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3-1. Create an account status (master data)
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(8)}`,
    label: "Active account status for testing",
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

  // 3-2. Create a community visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public visibility for testing",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3-3. Create a content policy category
  const policyCode = `harassment_${RandomGenerator.alphabets(5)}`;
  const contentPolicyBody = {
    code: policyCode,
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

  // 3-4. Create a report reason category
  const reportReasonBody = {
    code: `abuse_${RandomGenerator.alphabets(5)}`,
    name: "Abusive behavior",
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

  // 3-5. Create a platform setting that conceptually allows permanent bans
  const platformSettingBody = {
    key: `community_ban_permanent_allowed_${RandomGenerator.alphabets(6)}`,
    value: JSON.stringify({ permanentBanAllowed: true }),
    description:
      "Allow permanent community bans when expires_at is null in ban creation.",
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

  // 4. As the member user, create a community using the visibility level
  const memberLoginBody = {
    identifier: memberEmail,
    password: "Password123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  const communityIdentifier = `community_${RandomGenerator.alphabets(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Test Community ${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 10 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
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
    "community identifier matches create request",
    community.identifier,
    communityIdentifier,
  );

  // 5. Switch back to platform admin actor for ban creation
  const adminLoginBody = {
    identifier: adminEmail,
    password: "Password123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. Create a permanent community ban (expires_at = null)
  const startedAtNow: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const banCreateBody = {
    memberuser_id: memberAuthorized.id,
    reason: "Severe harassment - permanent ban for testing.",
    policy_category: contentPolicyCategory.code,
    started_at: startedAtNow,
    expires_at: null,
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

  // 7. Validate business rules and relationships
  TestValidator.equals(
    "ban community id matches created community",
    ban.community.id,
    community.id,
  );

  TestValidator.equals(
    "ban member user matches target member",
    ban.memberUser.id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "ban policy_category equals requested code",
    ban.policy_category,
    contentPolicyCategory.code,
  );

  TestValidator.equals(
    "ban reason is persisted correctly",
    ban.reason,
    banCreateBody.reason,
  );

  TestValidator.equals(
    "ban expires_at is null for permanent ban",
    ban.expires_at,
    null,
  );

  TestValidator.predicate("ban is active flag is true", ban.is_active === true);

  TestValidator.equals(
    "ban started_at matches requested value",
    ban.started_at,
    startedAtNow,
  );
}
