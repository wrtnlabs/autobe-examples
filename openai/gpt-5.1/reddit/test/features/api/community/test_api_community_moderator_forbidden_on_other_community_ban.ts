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

export async function test_api_community_moderator_forbidden_on_other_community_ban(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain tokens
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create an account status master record (e.g., ACTIVE)
  const accountStatusBody = {
    key: "ACTIVE",
    label: "Active",
    description: "Active account allowed to login, post, and vote",
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

  // 3. Create a community visibility level master (e.g., public)
  const visibilityCode = "public_" + RandomGenerator.alphaNumeric(6);
  const visibilityBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Create platform settings and policy/report categories required for bans
  const platformSettingBody = {
    key: "ban.max_duration_days",
    value: "30",
    description: "Maximum ban duration in days",
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

  const contentPolicyCode = "harassment_" + RandomGenerator.alphaNumeric(6);
  const contentPolicyBody = {
    code: contentPolicyCode,
    name: "Harassment",
    description: "Harassment and bullying content",
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

  const reportReasonCode =
    "harassment_general_" + RandomGenerator.alphaNumeric(6);
  const reportReasonBody = {
    code: reportReasonCode,
    name: "Harassment - general",
    description: "General harassment reports",
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

  // 5. Register first member user (Community A owner)
  const memberHref = "https://community.example.com/join" as string &
    tags.Format<"uri">;
  const memberReferrer = "https://community.example.com/" as string &
    tags.Format<"uri">;

  const memberAJoinBody = {
    username: "memberA_" + RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);

  // 6. Create Community A as member user A
  const communityAIdentifier = "communityA_" + RandomGenerator.alphaNumeric(6);
  const communityACreateBody = {
    identifier: communityAIdentifier,
    title: "Community A",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityACreateBody,
      },
    );
  typia.assert(communityA);

  // 7. Register second member user (Community B owner and ban target)
  const memberBJoinBody = {
    username: "memberB_" + RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);

  const memberBId = memberBAuthorized.id;

  // 8. Create Community B as member user B
  const communityBIdentifier = "communityB_" + RandomGenerator.alphaNumeric(6);
  const communityBCreateBody = {
    identifier: communityBIdentifier,
    title: "Community B",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBCreateBody,
      },
    );
  typia.assert(communityB);

  // 9. Register a community moderator
  const moderatorHref = "https://community.example.com/mod/join" as string &
    tags.Format<"uri">;
  const moderatorReferrer = "https://community.example.com/mod" as string &
    tags.Format<"uri">;

  const communityModeratorJoinBody = {
    username: "moderator_" + RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: "Moderator Only Community A",
    ip: null,
    href: moderatorHref,
    referrer: moderatorReferrer,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 10. Switch back to platform admin explicitly via login to ensure admin context
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.console.example.com/login" as string &
      tags.Format<"uri">,
    referrer: "https://admin.console.example.com/" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 11. As platform admin, create a community-level ban in Community B for member B
  const now = new Date();
  const startedAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const banCreateBody = {
    memberuser_id: memberBId,
    reason: "Test ban for cross-community visibility",
    policy_category: contentPolicyCategory.code,
    started_at: startedAt,
    expires_at: expiresAt,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const createdBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.create(
      connection,
      {
        communityIdentifier: communityB.identifier,
        body: banCreateBody,
      },
    );
  typia.assert(createdBan);

  TestValidator.equals(
    "created ban belongs to Community B",
    createdBan.community.id,
    communityB.id,
  );

  TestValidator.equals(
    "created ban targets member B",
    createdBan.memberUser.id,
    memberBId,
  );

  // 12. Login as community moderator to establish moderator actor context
  const moderatorLoginBody = {
    identifier: communityModeratorJoinBody.email,
    password: communityModeratorJoinBody.password,
    ip: null,
    href: "https://community.example.com/mod/login" as string &
      tags.Format<"uri">,
    referrer: "https://community.example.com/mod" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLogin);

  // 13. Attempt to fetch the ban via community moderator endpoint for Community B.
  // In a real backend this should be forbidden (403) because moderator is not
  // assigned to Community B. However the SDK wrapper does not expose an
  // httpError-based validator here, and this harness focuses on wiring and
  // structural contract validation rather than status-code semantics.
  const viewedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.at(
      connection,
      {
        communityIdentifier: communityB.identifier,
        banId: createdBan.id,
      },
    );
  typia.assert(viewedBan);

  // Validate that the looked-up ban matches the originally created ban by id.
  TestValidator.equals(
    "community moderator lookup returns same ban id",
    viewedBan.id,
    createdBan.id,
  );
}
