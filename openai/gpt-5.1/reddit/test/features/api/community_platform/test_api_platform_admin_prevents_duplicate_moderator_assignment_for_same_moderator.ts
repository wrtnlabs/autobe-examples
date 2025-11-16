import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Ensure platform admin cannot create duplicate moderator assignments for the
 * same moderator and community.
 *
 * Business flow:
 *
 * 1. Register a platform admin and obtain tokens.
 * 2. As platform admin, create an account status (master data prerequisite).
 * 3. As platform admin, create a community visibility level and capture its code.
 * 4. Register a member user, switching authentication to memberUser.
 * 5. As memberUser, create a community using the visibility level code; capture
 *    its identifier.
 * 6. Switch back to platform admin via login.
 * 7. As platform admin, create a first moderator assignment for the community;
 *    capture the moderator id from response.
 * 8. Attempt to create a second moderator assignment with the same
 *    moderator/community pair.
 * 9. Assert that the second call throws an error, indicating duplicate/uniqueness
 *    enforcement.
 */
export async function test_api_platform_admin_prevents_duplicate_moderator_assignment_for_same_moderator(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) - this also authenticates as platformAdmin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.mobile(),
    href: "https://admin.console.example.com/register",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create an account status as platform admin
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(8)}`,
    label: "Active Moderator Status",
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 3. Create a community visibility level as platform admin
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code should match request code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. Register a member user (join) - switch auth to memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.mobile(),
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. As memberUser, create a community using the visibilityLevelCode
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community identifier should match request identifier",
    community.identifier,
    communityIdentifier,
  );

  // 6. Switch back to platform admin using login
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: platformAdminJoinBody.ip,
    href: "https://admin.console.example.com/login",
    referrer: platformAdminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 7. First moderator assignment creation for the community
  const firstAssignedAt = new Date().toISOString();
  const firstAssignmentBody = {
    communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
    assignedAt: firstAssignedAt,
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const firstAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: firstAssignmentBody,
      },
    );
  typia.assert(firstAssignment);

  // Capture the actual moderator id from the created assignment
  const moderatorId = firstAssignment.communityModerator.id;
  TestValidator.equals(
    "first assignment community identifier matches created community",
    firstAssignment.community.id,
    community.id,
  );

  // 8. Attempt duplicate moderator assignment with same moderator/community
  const duplicateAssignmentBody = {
    communityModeratorId: moderatorId,
    assignedAt: new Date().toISOString(),
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  await TestValidator.error(
    "duplicate moderator assignment for same moderator/community should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
        connection,
        {
          communityIdentifier: communityIdentifier,
          body: duplicateAssignmentBody,
        },
      );
    },
  );
}
