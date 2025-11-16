import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_membership_detail_for_inactive_membership(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (and becomes authenticated)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platformAdmin, create a visibility level
  const visibilityCode = `vl-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code matches",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins (and becomes authenticated)
  const memberUserEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberUserEmail,
    password: "M3mb3rP@ss",
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create a community with that visibility level
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
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
    "community identifier matches create payload",
    community.identifier,
    communityIdentifier,
  );

  // 5. As memberUser, create a membership request for realism
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);
  TestValidator.equals(
    "membership request community id matches community",
    membershipRequest.community.id,
    community.id,
  );

  // 6. Community moderator joins (and becomes authenticated)
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Mod3r@t0r",
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 7. As communityModerator, create an active membership for the member user
  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const activeMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(activeMembership);
  TestValidator.equals(
    "active membership member user id matches",
    activeMembership.memberuser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "active membership community id matches",
    activeMembership.community.id,
    community.id,
  );
  TestValidator.predicate(
    "membership is initially active",
    activeMembership.is_active === true,
  );

  // 8. As communityModerator, update membership to inactive
  const membershipUpdateBody = {
    is_active: false,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const inactiveMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.update(
      connection,
      {
        communityIdentifier: communityIdentifier,
        membershipId: activeMembership.id,
        body: membershipUpdateBody,
      },
    );
  typia.assert(inactiveMembership);
  TestValidator.predicate(
    "membership is now inactive after update",
    inactiveMembership.is_active === false,
  );
  TestValidator.predicate(
    "ended_at should be set for inactive membership",
    inactiveMembership.ended_at !== null &&
      inactiveMembership.ended_at !== undefined,
  );

  // 9. Switch back to platformAdmin using login to ensure correct actor context
  const platformAdminLoginBody = {
    identifier: platformAdminAuthorized.email,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 10. As platformAdmin, retrieve membership details via platformAdmin endpoint
  const membershipDetail: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMemberships.at(
      connection,
      {
        memberUserId: memberAuthorized.id,
        membershipId: inactiveMembership.id,
      },
    );
  typia.assert(membershipDetail);

  // 11. Business assertions on retrieved inactive membership
  TestValidator.equals(
    "platformAdmin view: membership id matches",
    membershipDetail.id,
    inactiveMembership.id,
  );
  TestValidator.equals(
    "platformAdmin view: member user id matches",
    membershipDetail.memberuser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "platformAdmin view: community id matches",
    membershipDetail.community.id,
    community.id,
  );
  TestValidator.predicate(
    "platformAdmin view: membership is inactive",
    membershipDetail.is_active === false,
  );
  TestValidator.predicate(
    "platformAdmin view: ended_at is populated",
    membershipDetail.ended_at !== null &&
      membershipDetail.ended_at !== undefined,
  );
}
