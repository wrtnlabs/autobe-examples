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

export async function test_api_platform_admin_deletes_inactive_moderator_session_as_cleanup(
  connection: api.IConnection,
) {
  // -------------------------------------------------------------------------
  // 1. REGISTER PLATFORM ADMIN AND CREATE MASTER DATA
  // -------------------------------------------------------------------------
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphabets(16);

  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: RandomGenerator.alphaNumeric(8),
        href: "https://admin-join.example.com/",
        referrer: "https://landing.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: `ACTIVE_${RandomGenerator.alphabets(8)}`,
          label: "Active",
          description: "Active accounts can login, post, and vote.",
          isLoginAllowed: true,
          isPostingAllowed: true,
          isVotingAllowed: true,
          requiresManualReview: false,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert(accountStatus);

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `public_${RandomGenerator.alphabets(6)}`,
          name: "Public",
          description: "Publicly discoverable community.",
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // -------------------------------------------------------------------------
  // 2. REGISTER MEMBER USER AND CREATE COMMUNITY
  // -------------------------------------------------------------------------
  const memberUserEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberUserPassword: string = RandomGenerator.alphabets(14);

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: memberUserEmail,
        password: memberUserPassword,
        ip: RandomGenerator.alphaNumeric(8),
        href: "https://member-join.example.com/",
        referrer: "https://landing.example.com/member",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community_${RandomGenerator.alphabets(6)}`,
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 3,
            wordMax: 8,
          }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // -------------------------------------------------------------------------
  // 3. REGISTER COMMUNITY MODERATOR, MEMBERSHIP & ASSIGNMENT
  // -------------------------------------------------------------------------
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword: string = RandomGenerator.alphabets(14);

  const moderatorJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        ip: RandomGenerator.alphaNumeric(8),
        href: "https://moderator-join.example.com/",
        referrer: "https://landing.example.com/mod",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorJoin);

  // Authenticate as communityModerator to use moderator endpoints
  const moderatorLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        identifier: moderatorEmail,
        password: moderatorPassword,
        ip: RandomGenerator.alphaNumeric(8),
        href: "https://moderator-login.example.com/",
        referrer: "https://landing.example.com/mod/login",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert(moderatorLogin);

  // Create membership for the member user in the community using moderator actor
  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          memberuser_id: memberJoin.id,
          is_active: true,
        } satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership);

  // Create a moderator assignment for the moderator in the same community
  const assignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.communityModerator.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          communityModeratorId: moderatorJoin.id,
          assignedAt: new Date().toISOString(),
          revokedAt: null,
          isActive: true,
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // -------------------------------------------------------------------------
  // 4. DELETE MODERATOR SESSION AS PLATFORM ADMIN (CLEANUP)
  // -------------------------------------------------------------------------
  // Re-login as platform admin to ensure we have an admin context
  const adminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: platformAdminPassword,
        ip: RandomGenerator.alphaNumeric(8),
        href: "https://admin-login.example.com/",
        referrer: "https://landing.example.com/admin/login",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(adminLogin);

  const syntheticSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // First delete attempt
  await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.erase(
    connection,
    {
      communityModeratorId: moderatorJoin.id,
      sessionId: syntheticSessionId,
    },
  );

  // Second delete attempt with same identifiers (idempotent-style behavior)
  await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.erase(
    connection,
    {
      communityModeratorId: moderatorJoin.id,
      sessionId: syntheticSessionId,
    },
  );

  // -------------------------------------------------------------------------
  // 5. NEGATIVE AUTHORIZATION TESTS
  // -------------------------------------------------------------------------
  // 5-1) memberUser should not be able to erase moderator sessions
  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberUserEmail,
        password: memberUserPassword,
        ip: RandomGenerator.alphaNumeric(8),
        href: "https://member-login.example.com/",
        referrer: "https://landing.example.com/member/login",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLogin);

  await TestValidator.error(
    "member user cannot delete moderator sessions",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.erase(
        connection,
        {
          communityModeratorId: moderatorJoin.id,
          sessionId: syntheticSessionId,
        },
      );
    },
  );

  // 5-2) communityModerator should not be able to erase sessions via admin path
  const moderatorRelogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        identifier: moderatorEmail,
        password: moderatorPassword,
        ip: RandomGenerator.alphaNumeric(8),
        href: "https://moderator-login-2.example.com/",
        referrer: "https://landing.example.com/mod/login2",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert(moderatorRelogin);

  await TestValidator.error(
    "community moderator cannot delete sessions via platform admin endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.erase(
        connection,
        {
          communityModeratorId: moderatorJoin.id,
          sessionId: syntheticSessionId,
        },
      );
    },
  );
}
