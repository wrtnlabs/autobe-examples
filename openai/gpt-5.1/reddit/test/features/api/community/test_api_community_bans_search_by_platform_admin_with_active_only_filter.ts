import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";

export async function test_api_community_bans_search_by_platform_admin_with_active_only_filter(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://platform.example.com/admin/join",
    referrer: "https://platform.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail = adminAuthorized.email;

  // 2. Create an account status (simple active-like status)
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(8)}`,
    label: "Active",
    description: "Active accounts are fully permitted to use the platform.",
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

  // 3. Create a community visibility level
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public",
    description: "Public communities are visible and joinable by all members.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 4. Register a member user (this also authenticates as member user)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://platform.example.com/member/join",
    referrer: "https://platform.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;
  const memberIdentifierForLogin = memberAuthorized.email;

  // 5. Login explicitly as the member user (ensure session token)
  const memberLoginBody = {
    identifier: memberIdentifierForLogin,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://platform.example.com/member/login",
    referrer: "https://platform.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 6. Create a community as the member user
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 7. Subscribe the member user to the community
  const subscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionBody,
      },
    );
  typia.assert(subscription);

  // 8. Register and login a community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://platform.example.com/mod/join",
    referrer: "https://platform.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://platform.example.com/mod/login",
    referrer: "https://platform.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLogin);

  // 9. Create two bans: one active, one expired
  const now = new Date();
  const minutes = 60 * 1000;

  const activeStart = new Date(now.getTime() - 10 * minutes).toISOString();
  const activeEnd = new Date(now.getTime() + 60 * minutes).toISOString();

  const expiredStart = new Date(now.getTime() - 120 * minutes).toISOString();
  const expiredEnd = new Date(now.getTime() - 30 * minutes).toISOString();

  const activeBanBody = {
    memberuser_id: memberUserId,
    reason: "Active ban for policy testing",
    policy_category: "test-policy",
    started_at: activeStart,
    expires_at: activeEnd,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const activeBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: activeBanBody,
      },
    );
  typia.assert(activeBan);

  const expiredBanBody = {
    memberuser_id: memberUserId,
    reason: "Expired ban for policy testing",
    policy_category: "test-policy",
    started_at: expiredStart,
    expires_at: expiredEnd,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const expiredBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: expiredBanBody,
      },
    );
  typia.assert(expiredBan);

  // 10. Switch connection back to platform admin
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://platform.example.com/admin/login",
    referrer: "https://platform.example.com/home",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 11. Query bans with is_active = true and window that covers both bans by started_at
  const startedFrom = new Date(now.getTime() - 180 * minutes).toISOString();
  const startedTo = new Date(now.getTime() + 120 * minutes).toISOString();

  const activeQueryBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    is_active: true,
    started_from: startedFrom,
    started_to: startedTo,
    expires_from: null,
    expires_to: null,
    policy_category: null,
  } satisfies ICommunityPlatformCommunityBan.IRequest;

  const activePage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityBans.index(
      connection,
      {
        memberUserId: memberUserId as string & tags.Format<"uuid">,
        body: activeQueryBody,
      },
    );
  typia.assert(activePage);

  TestValidator.predicate(
    "platform admin should see at least one active ban",
    activePage.pagination.records >= 1,
  );

  await ArrayUtil.asyncForEach(activePage.data, async (summary) => {
    TestValidator.predicate(
      "every ban in active-only query must be active",
      summary.is_active === true,
    );
    TestValidator.equals(
      "every ban should target the expected member user",
      summary.memberUser.id,
      memberUserId,
    );
  });

  // 12. Query bans with is_active = false using the same window
  const inactiveQueryBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    is_active: false,
    started_from: startedFrom,
    started_to: startedTo,
    expires_from: null,
    expires_to: null,
    policy_category: null,
  } satisfies ICommunityPlatformCommunityBan.IRequest;

  const inactivePage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityBans.index(
      connection,
      {
        memberUserId: memberUserId as string & tags.Format<"uuid">,
        body: inactiveQueryBody,
      },
    );
  typia.assert(inactivePage);

  TestValidator.predicate(
    "platform admin should see at least one inactive/expired ban",
    inactivePage.pagination.records >= 1,
  );

  await ArrayUtil.asyncForEach(inactivePage.data, async (summary) => {
    TestValidator.predicate(
      "every ban in inactive-only query must be inactive",
      summary.is_active === false,
    );
    TestValidator.equals(
      "every inactive ban should target the expected member user",
      summary.memberUser.id,
      memberUserId,
    );
  });
}
