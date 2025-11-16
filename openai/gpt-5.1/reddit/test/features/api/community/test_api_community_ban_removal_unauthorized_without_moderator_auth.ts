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
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_ban_removal_unauthorized_without_moderator_auth(
  connection: api.IConnection,
) {
  // 1. Platform admin join (this will also set Authorization header on connection)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@platform.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a community visibility level as platformAdmin
  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphabets(6)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Create an account status as platformAdmin (not wired directly, but realistic setup)
  const accountStatusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(5)}`,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 4. Register a member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12),
    ip: undefined,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Ensure we have the member id for banning
  const memberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 5. Register a community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@moderator.example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: undefined,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 6. Login as member user to create a community
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: undefined,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 7. Create a community as the member user, referencing visibility level code
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(6)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  const communityIdentifier: string = community.identifier;

  // 8. Optionally create a membership request for realism
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);

  // 9. Login as community moderator
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: undefined,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLogin);

  // 10. Create a community-level ban for the member user as authenticated moderator
  const nowIso = new Date().toISOString();

  const banCreateBody = {
    memberuser_id: memberId,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    policy_category: "test_policy",
    started_at: nowIso,
    expires_at: null,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const ban: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier,
        body: banCreateBody,
      },
    );
  typia.assert(ban);

  const banId: string & tags.Format<"uuid"> = ban.id;

  // 11. Build an unauthenticated connection by clearing headers on a clone
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 12. Attempt to delete the ban without moderator auth – expect error
  await TestValidator.error(
    "unauthorized ban deletion should fail without moderator auth",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.bans.erase(
        unauthenticatedConnection,
        {
          communityIdentifier,
          banId,
        },
      );
    },
  );

  // Note: We cannot re-fetch the ban with existing SDK, but reaching here
  // means the unauthorized erase attempt threw, so the ban was not silently
  // removed by an unauthenticated call.
}
