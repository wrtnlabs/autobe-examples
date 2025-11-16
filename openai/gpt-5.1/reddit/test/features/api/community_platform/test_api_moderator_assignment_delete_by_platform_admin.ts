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
 * Validate that a platform administrator can delete a community moderator
 * assignment and that deletion is both permanent and properly authorized.
 *
 * Business goals:
 *
 * - A platformAdmin must be able to create and then permanently delete a
 *   moderator assignment for a specific community.
 * - Deletion must require platformAdmin authorization (a memberUser should not be
 *   able to call the same DELETE endpoint successfully).
 * - Deleting an already-deleted or non-existent assignment should result in an
 *   error.
 *
 * Due to available APIs, we cannot fetch moderator assignments after deletion,
 * so we validate by:
 *
 * - Successful completion of the first erase() call for a real assignment.
 * - Error responses for repeated deletion and for deletion by a non-admin actor.
 *
 * High-level steps:
 *
 * 1. Create a platform admin and obtain an authenticated admin context.
 * 2. As platformAdmin, create an account status and a community visibility level
 *    (master data prerequisites).
 * 3. Create a member user and authenticate it.
 * 4. As memberUser, create a community using the created visibility level code.
 * 5. Switch back to platformAdmin and create a moderator assignment for the
 *    community.
 * 6. As platformAdmin, delete the moderator assignment via the erase() API.
 * 7. As platformAdmin, attempt to delete the same moderator assignment again and
 *    assert that an error is thrown.
 * 8. Switch to memberUser and attempt to delete the same moderator assignment and
 *    assert that an error is thrown, demonstrating authorization enforcement.
 */
export async function test_api_moderator_assignment_delete_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (also authenticates as platformAdmin).
  const adminJoinInput = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPass123!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platformAdmin, create an account status master entry.
  const accountStatusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active",
    description: "Active accounts can login, post, and vote.",
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

  // 3. As platformAdmin, create a community visibility level master.
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description:
      "Public communities are discoverable and viewable by everyone.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 4. Create a member user and authenticate as that member.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@member.example.com`,
    password: "MemberPass123!",
    ip: "127.0.0.1",
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. As memberUser, create a community using the visibility level code.
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 6. Switch back to platformAdmin via login to ensure admin auth context.
  const adminLoginBody = {
    identifier: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 7. As platformAdmin, create a moderator assignment for the community.
  const moderatorAssignmentCreateBody = {
    communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
    assignedAt: new Date().toISOString(),
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const moderatorAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: moderatorAssignmentCreateBody,
      },
    );
  typia.assert(moderatorAssignment);

  // 8. As platformAdmin, delete the moderator assignment.
  await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      moderatorAssignmentId: moderatorAssignment.id,
    },
  );

  // 9. Verify that deleting the same assignment again as platformAdmin fails.
  await TestValidator.error(
    "re-deleting same moderator assignment fails",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.erase(
        connection,
        {
          communityIdentifier: community.identifier,
          moderatorAssignmentId: moderatorAssignment.id,
        },
      );
    },
  );

  // 10. Switch to memberUser via login and confirm unauthorized deletion fails.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorizedAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorizedAgain);

  await TestValidator.error(
    "memberUser cannot delete moderator assignment (authorization enforced)",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.erase(
        connection,
        {
          communityIdentifier: community.identifier,
          moderatorAssignmentId: moderatorAssignment.id,
        },
      );
    },
  );
}
