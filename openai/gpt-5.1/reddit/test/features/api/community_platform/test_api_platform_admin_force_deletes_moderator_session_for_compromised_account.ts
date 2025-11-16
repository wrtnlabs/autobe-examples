import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Platform admin forcibly deletes a community moderator session for a
 * compromised account.
 *
 * Business goals:
 *
 * - Ensure that only a platform administrator can invoke the force-delete
 *   operation on community moderator sessions.
 * - Exercise the full, realistic setup of actors and data relationships: account
 *   statuses, visibility levels, community, membership, and moderator
 *   assignment, before attempting session deletion.
 * - Validate that the erase endpoint is callable with correct path parameters
 *   under platformAdmin credentials without throwing, and that the same call
 *   under a non-admin actor fails.
 *
 * Steps:
 *
 * 1. Register a platform admin via /auth/platformAdmin/join and rely on the SDK to
 *    install the admin access token into the connection headers.
 * 2. As platformAdmin, create a valid account status row via
 *    /communityPlatform/platformAdmin/accountStatuses.create.
 * 3. As platformAdmin, create a community visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.create.
 * 4. Register a member user via /auth/memberUser/join. The connection’s
 *    Authorization header now points to the member user.
 * 5. As memberUser, create a community using
 *    /communityPlatform/memberUser/communities.create with the visibility level
 *    code from step 3.
 * 6. Register a community moderator via /auth/communityModerator/join. The
 *    connection’s Authorization header now points to the communityModerator.
 * 7. As communityModerator, create a membership in the community for the member
 *    user using
 *    /communityPlatform/communityModerator/communities/{communityIdentifier}/memberships.create.
 * 8. As communityModerator, create a moderator assignment for the community via
 *    /communityPlatform/communityModerator/communities/{communityIdentifier}/moderatorAssignments.create,
 *    obtaining a concrete moderatorAssignment whose communityModerator.id we
 *    will use as the target moderator id.
 * 9. Re-authenticate as platformAdmin via /auth/platformAdmin/login so that the
 *    connection’s Authorization header represents the privileged actor who is
 *    allowed to force-delete moderator sessions.
 * 10. Call api.functional.communityPlatform.platformAdmin.communityModerators.sessions.erase
 *     with the real moderator id from step 8 and a randomly generated UUID as
 *     sessionId, ensuring that the call completes without throwing.
 * 11. For the negative case, switch back to the communityModerator actor via
 *     /auth/communityModerator.login and attempt the same erase call, this time
 *     asserting with TestValidator.error that an error is thrown, which
 *     demonstrates that non-admin actors cannot use this endpoint.
 */
export async function test_api_platform_admin_force_deletes_moderator_session_for_compromised_account(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) - this also authenticates as platformAdmin
  const platformAdminJoinInput = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinInput,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platformAdmin, create an account status
  const accountStatusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(5)}`,
    label: "Active",
    description: "Active account status for actors",
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

  // 3. As platformAdmin, create a community visibility level
  const visibilityLevelCreateBody = {
    code: `public_${RandomGenerator.alphabets(5)}`,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelCreateBody },
    );
  typia.assert(visibilityLevel);

  // 4. Register member user (join)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.mobile(),
    href: "https://member.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. As memberUser, create a community using the visibility level code
  const communityCreateBody = {
    identifier: RandomGenerator.alphabets(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevelCreateBody.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. Register a community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://moderator.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 7. As communityModerator, create membership for the member in the community
  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 8. As communityModerator, create moderator assignment for the community
  const now = new Date();
  const moderatorAssignmentCreateBody = {
    communityModeratorId: moderatorAuthorized.id,
    assignedAt: now.toISOString(),
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const moderatorAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.communityModerator.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: moderatorAssignmentCreateBody,
      },
    );
  typia.assert(moderatorAssignment);

  const communityModeratorId = moderatorAssignment.communityModerator.id;

  // 9. Re-authenticate as platformAdmin (login) so subsequent calls run under admin
  const platformAdminLoginBody = {
    identifier: platformAdminJoinInput.email,
    password: platformAdminJoinInput.password,
    ip: RandomGenerator.mobile(),
    href: "https://admin.login.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 10. Happy path: platformAdmin can call erase without error
  const targetSessionId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.erase(
    connection,
    {
      communityModeratorId,
      sessionId: targetSessionId,
    },
  );

  // If we reached here, the call did not throw; assert via predicate
  TestValidator.predicate("platform admin can call erase without error", true);

  // 11. Negative case: communityModerator attempting erase should fail
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: RandomGenerator.mobile(),
    href: "https://moderator.login.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoggedIn);

  const unauthorizedSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "community moderator cannot call admin-only erase endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.erase(
        connection,
        {
          communityModeratorId,
          sessionId: unauthorizedSessionId,
        },
      );
    },
  );
}
