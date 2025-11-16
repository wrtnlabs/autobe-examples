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
 * Verify that community moderator sessions can only be deleted by an
 * authenticated platform administrator.
 *
 * Business goals:
 *
 * - An unauthenticated client must not be able to delete a moderator session.
 * - Authenticated non-admin actors (memberUser, communityModerator) must not be
 *   able to delete a moderator session via the platformAdmin-only endpoint.
 * - A properly authenticated platformAdmin must be able to call the erase
 *   endpoint successfully (positive control).
 *
 * High-level steps:
 *
 * 1. Join as a platformAdmin and seed master data: create an account status and a
 *    community visibility level.
 * 2. Join as a memberUser and create a community using the created visibility
 *    level.
 * 3. Join as a communityModerator, create a membership in the community, and
 *    create a moderator assignment.
 * 4. Prepare a (communityModeratorId, sessionId) pair for the erase endpoint.
 * 5. Using an unauthenticated connection, verify that erase throws.
 * 6. Using an authenticated memberUser, verify that erase throws.
 * 7. Using an authenticated communityModerator, verify that erase throws.
 * 8. Using an authenticated platformAdmin, verify that erase succeeds.
 */
export async function test_api_platform_admin_cannot_delete_moderator_session_without_auth(
  connection: api.IConnection,
) {
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = "P@ssw0rd!";

  const platformAdminJoinOutput: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: RandomGenerator.alphabets(8),
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoinOutput);

  const accountStatusCreateBody = {
    key: "ACTIVE_ACCOUNT_STATUS",
    label: "Active account",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  const visibilityLevelCreateBody = {
    code: "public_visibility_code",
    name: "Public visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  const memberUserEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberUserPassword: string = "MemberP@ss1";

  const memberJoinOutput: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: memberUserEmail,
        password: memberUserPassword,
        ip: null,
        href: "https://community.example.com/join",
        referrer: "https://community.example.com/home",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoinOutput);

  const communityCreateBody = {
    identifier: RandomGenerator.alphabets(16),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
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

  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword: string = "ModeratorP@ss1";

  const moderatorJoinOutput: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://moderator.example.com/join",
        referrer: "https://moderator.example.com/landing",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorJoinOutput);

  const communityIdentifier: string = community.identifier;

  const membershipCreateBody = {
    memberuser_id: memberJoinOutput.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const moderatorAssignmentCreateBody = {
    communityModeratorId: moderatorJoinOutput.id,
    assignedAt: nowIso,
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const moderatorAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.communityModerator.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier,
        body: moderatorAssignmentCreateBody,
      },
    );
  typia.assert(moderatorAssignment);

  const communityModeratorId: string & tags.Format<"uuid"> =
    moderatorJoinOutput.id;
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated client cannot delete community moderator session",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.erase(
        unauthConn,
        {
          communityModeratorId,
          sessionId,
        },
      );
    },
  );

  const memberLoginOutput: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberUserEmail,
        password: memberUserPassword,
        ip: null,
        href: "https://community.example.com/login",
        referrer: "https://community.example.com/home",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLoginOutput);

  await TestValidator.error(
    "memberUser cannot delete community moderator session via platformAdmin endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.erase(
        connection,
        {
          communityModeratorId,
          sessionId,
        },
      );
    },
  );

  const moderatorLoginOutput2: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        identifier: moderatorEmail,
        password: moderatorPassword,
        ip: null,
        href: "https://moderator.example.com/login",
        referrer: "https://moderator.example.com/home",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert(moderatorLoginOutput2);

  await TestValidator.error(
    "communityModerator cannot delete moderator session via platformAdmin endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.erase(
        connection,
        {
          communityModeratorId,
          sessionId,
        },
      );
    },
  );

  const platformAdminLoginOutput: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: platformAdminPassword,
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/home",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLoginOutput);

  await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.erase(
    connection,
    {
      communityModeratorId,
      sessionId,
    },
  );
}
