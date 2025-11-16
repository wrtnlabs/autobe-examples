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
 * Platform-admin view: requesting a non-existent community moderator assignment
 * should fail.
 *
 * Business flow covered by this test:
 *
 * 1. Register a platform administrator and obtain an authenticated platformAdmin
 *    session.
 * 2. As the platform admin, create an account status definition for general use.
 * 3. As the platform admin, create a community visibility level that member users
 *    can reference.
 * 4. Register a member user and implicitly authenticate them.
 * 5. As the member user, create a community using the newly created visibility
 *    level and capture its identifier.
 * 6. Switch back to the platform admin actor via login.
 * 7. Invoke GET
 *    /communityPlatform/platformAdmin/communities/{communityIdentifier}/moderatorAssignments/{moderatorAssignmentId}
 *    with a moderatorAssignmentId that is guaranteed not to exist for that
 *    community.
 * 8. Verify that the endpoint call fails (throws an error) instead of returning a
 *    ICommunityPlatformCommunityModeratorAssignment, without inspecting status
 *    codes or relying on specific error payload details.
 */
export async function test_api_platform_admin_not_found_moderator_assignment(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (join) and obtain initial tokens
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPassword!123",
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const joinedAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Create an account status definition as platform admin
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active member status for tests",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
  const visibilityCode = `public-test-${RandomGenerator.alphaNumeric(6)}`;
  const visibilityLevelBody = {
    code: visibilityCode,
    name: "Public test visibility level",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Register a member user (join) – connection token switches to memberUser
  const memberUserPassword = "MemberPassword!123";
  const memberJoinBody = {
    username: `member_${RandomGenerator.alphabets(10)}`,
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: memberUserPassword,
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const joinedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(joinedMember);

  // 5. As the member user, create a community and capture its identifier
  const communityIdentifierBase = "not-found-moderator-assignment";
  const communityIdentifier = `${communityIdentifierBase}-${RandomGenerator.alphaNumeric(6)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Moderator assignment not-found community",
    description: RandomGenerator.paragraph({ sentences: 6 }),
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
  typia.assert(community);

  // Sanity check: ensure the created community identifier matches what we sent
  TestValidator.equals(
    "created community identifier should match request",
    community.identifier,
    communityIdentifier,
  );

  // 6. Switch back to platform admin context using login
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const loggedInAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 7. Prepare a non-existent moderatorAssignmentId
  const nonexistentAssignmentId: string = RandomGenerator.alphaNumeric(32);

  // 8. Call the moderatorAssignments.at endpoint and expect an error
  await TestValidator.error(
    "requesting a non-existent moderator assignment as platform admin should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.at(
        connection,
        {
          communityIdentifier: community.identifier,
          moderatorAssignmentId: nonexistentAssignmentId,
        },
      );
    },
  );
}
