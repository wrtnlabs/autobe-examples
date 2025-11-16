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
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a community moderator sees correct temporal and policy fields
 * for temporary vs permanent community bans when using the ban detail
 * endpoint.
 *
 * Business flow:
 *
 * 1. Platform admin registers and logs in.
 * 2. Platform admin creates a permissive account status and a visibility level.
 * 3. Member user registers, logs in, and creates a community using that visibility
 *    level.
 * 4. Community moderator registers and logs in.
 * 5. Moderator issues a temporary community ban for the member in that community.
 * 6. Moderator loads the ban via memberUsers/communityBans.at and verifies
 *    temporal fields and policy metadata.
 * 7. Moderator issues a permanent ban (no expires_at) and loads it back, verifying
 *    started_at, null-ish expires_at, and policy fields.
 */
export async function test_api_community_moderator_sees_temporary_vs_permanent_ban_fields(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-auth via SDK) and is now authenticated.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminAuth);

  // 2. Platform admin creates an account status (permissive, business-wise).
  const statusCreateBody = {
    key: "ACTIVE_MODERATOR_STATUS",
    label: "Active Moderator Status",
    description: "Status allowing full login, posting, and voting.",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // 3. Platform admin creates a visibility level used by member communities.
  const visibilityCode = "public-test-visibility";
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: "Visibility level used for ban tests.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 4. Member user joins and logs in.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: undefined,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // Explicit login to exercise login path (not strictly required for token).
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: undefined,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuth);

  // 5. Member user creates a community.
  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 6. Community moderator joins and logs in.
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    ip: undefined,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderatorAuth);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: undefined,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorLoginAuth,
  );

  // 7. Moderator creates a temporary ban with started_at and expires_at.
  const now = new Date();
  const startedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const tempBanReason = "temporary test ban";
  const tempBanPolicy = "policy-temp";

  const tempBanCreateBody = {
    memberuser_id: memberAuthorized.id,
    reason: tempBanReason,
    policy_category: tempBanPolicy,
    started_at: startedAt,
    expires_at: expiresAt,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const tempBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: tempBanCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityBan>(tempBan);

  // Fetch temporary ban via memberUsers.communityBans.at
  const tempBanDetail: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.memberUsers.communityBans.at(
      connection,
      {
        memberUserId: memberAuthorized.id,
        banId: tempBan.id,
      },
    );
  typia.assert<ICommunityPlatformCommunityBan>(tempBanDetail);

  // Assertions for temporary ban.
  TestValidator.equals(
    "temporary ban: community id matches",
    tempBanDetail.community.id,
    community.id,
  );
  TestValidator.equals(
    "temporary ban: member user id matches",
    tempBanDetail.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.predicate(
    "temporary ban: started_at is non-empty",
    tempBanDetail.started_at.length > 0,
  );
  TestValidator.predicate(
    "temporary ban: expires_at is defined and non-null",
    tempBanDetail.expires_at !== null && tempBanDetail.expires_at !== undefined,
  );
  TestValidator.equals(
    "temporary ban: reason matches",
    tempBanDetail.reason,
    tempBanReason,
  );
  TestValidator.equals(
    "temporary ban: policy_category matches",
    tempBanDetail.policy_category,
    tempBanPolicy,
  );
  TestValidator.predicate(
    "temporary ban: is_active should be true soon after creation",
    tempBanDetail.is_active === true,
  );

  // 8. Moderator creates a permanent ban (no expires_at provided, started now).
  const permStartedAt = new Date().toISOString();
  const permBanReason = "permanent test ban";
  const permBanPolicy = "policy-permanent";

  const permBanCreateBody = {
    memberuser_id: memberAuthorized.id,
    reason: permBanReason,
    policy_category: permBanPolicy,
    started_at: permStartedAt,
    // expires_at omitted to represent a permanent ban
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const permBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: permBanCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityBan>(permBan);

  // Fetch permanent ban via detail endpoint.
  const permBanDetail: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.memberUsers.communityBans.at(
      connection,
      {
        memberUserId: memberAuthorized.id,
        banId: permBan.id,
      },
    );
  typia.assert<ICommunityPlatformCommunityBan>(permBanDetail);

  // Assertions for permanent ban.
  TestValidator.equals(
    "permanent ban: community id matches",
    permBanDetail.community.id,
    community.id,
  );
  TestValidator.equals(
    "permanent ban: member user id matches",
    permBanDetail.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.predicate(
    "permanent ban: started_at is non-empty",
    permBanDetail.started_at.length > 0,
  );
  TestValidator.predicate(
    "permanent ban: expires_at is null or undefined",
    permBanDetail.expires_at === null || permBanDetail.expires_at === undefined,
  );
  TestValidator.equals(
    "permanent ban: reason matches",
    permBanDetail.reason,
    permBanReason,
  );
  TestValidator.equals(
    "permanent ban: policy_category matches",
    permBanDetail.policy_category,
    permBanPolicy,
  );
  TestValidator.predicate(
    "permanent ban: is_active should be true",
    permBanDetail.is_active === true,
  );
}
