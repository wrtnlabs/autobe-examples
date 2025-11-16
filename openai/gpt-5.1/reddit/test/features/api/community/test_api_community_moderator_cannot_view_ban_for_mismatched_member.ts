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
 * Verify that a community moderator cannot read a community-level ban for a
 * member user when the ban actually belongs to a different member user.
 *
 * Business goal
 *
 * - Ensure the GET
 *   /communityPlatform/communityModerator/memberUsers/{memberUserId}/communityBans/{banId}
 *   endpoint enforces the relationship between `memberUserId` and `banId`,
 *   instead of just checking whether `banId` exists.
 * - When a moderator looks up a ban using a mismatched memberUserId, the API must
 *   fail and not leak any ban details.
 *
 * High-level steps
 *
 * 1. Provision actors:
 *
 *    - Platform admin
 *    - Community moderator
 *    - Two different member users (memberA and memberB)
 * 2. As platform admin, provision master data:
 *
 *    - Create an account status (realistic platform precondition)
 *    - Create a community visibility level and keep its business `code`
 * 3. As memberA, create a community using the visibility level code.
 * 4. As community moderator, create a community-level ban for memberA in the
 *    created community and capture the resulting ban id.
 * 5. Negative path: still as moderator, attempt to GET the ban using memberUserId
 *    = memberB.id and banId from step 4.
 * 6. Assert that this mismatched lookup fails with an error using
 *    TestValidator.error, and therefore no ban DTO is returned.
 * 7. Positive sanity check: lookup the same ban with memberUserId = memberA.id and
 *    verify that it succeeds, proving the failure in step 6 is due to scoping
 *    rather than missing data.
 */
export async function test_api_community_moderator_cannot_view_ban_for_mismatched_member(
  connection: api.IConnection,
) {
  // 1. Join/platform admin, community moderator, and two member users.

  // 1-1. Platform admin join
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "AdminPassword!123",
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 1-2. Community moderator join
  const communityModeratorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@moderators.example.com`,
    password: "ModeratorPass!123",
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://community.example.com/moderator/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModeratorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(communityModeratorAuthorized);

  // 1-3. MemberA join
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@members.example.com`,
    password: "MemberAPass!123",
    ip: undefined,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);

  // 1-4. MemberB join
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@members.example.com`,
    password: "MemberBPass!123",
    ip: undefined,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);

  // 2. As platform admin, login and create master data

  // 2-1. Platform admin login
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin-console.example.com/login",
    referrer: "https://admin-console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  // 2-2. Create an account status
  const accountStatusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(5)}`,
    label: "Active member",
    description: "Account is fully active and can interact normally.",
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

  // 2-3. Create a community visibility level
  const visibilityLevelCreateBody = {
    code: `public_${RandomGenerator.alphabets(6)}`,
    name: "Public community",
    description: "Community is visible and joinable by all members.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. As memberA, login and create a community

  const memberALoginBody = {
    identifier: memberAJoinBody.email,
    password: memberAJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberALoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALoginResult);

  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(6)}`,
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
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

  // 4. As community moderator, login and create a ban for memberA in the community

  const communityModeratorLoginBody = {
    identifier: communityModeratorJoinBody.email,
    password: communityModeratorJoinBody.password,
    ip: null,
    href: "https://community.example.com/moderator/login",
    referrer: "https://community.example.com/moderator",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const communityModeratorLoginResult: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: communityModeratorLoginBody,
    });
  typia.assert(communityModeratorLoginResult);

  const now = new Date();
  const banCreateBody = {
    memberuser_id: memberALoginResult.id,
    reason: "Violation of community guidelines for test.",
    policy_category: "test_policy",
    started_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const createdBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: banCreateBody,
      },
    );
  typia.assert(createdBan);

  TestValidator.equals(
    "ban is associated with memberA",
    createdBan.memberUser.id,
    memberALoginResult.id,
  );

  // 5. Negative scenario: mismatched memberUserId (memberB) with banId of memberA

  await TestValidator.error(
    "community moderator cannot view ban with mismatched member user id",
    async () => {
      await api.functional.communityPlatform.communityModerator.memberUsers.communityBans.at(
        connection,
        {
          memberUserId: memberBAuthorized.id,
          banId: createdBan.id,
        },
      );
    },
  );

  // 6. Positive sanity check: same moderator reads the ban using correct memberUserId

  const reloadedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.memberUsers.communityBans.at(
      connection,
      {
        memberUserId: memberALoginResult.id,
        banId: createdBan.id,
      },
    );
  typia.assert(reloadedBan);

  TestValidator.equals(
    "reloaded ban id matches created ban id",
    reloadedBan.id,
    createdBan.id,
  );
  TestValidator.equals(
    "reloaded ban member user id matches memberA",
    reloadedBan.memberUser.id,
    memberALoginResult.id,
  );
}
