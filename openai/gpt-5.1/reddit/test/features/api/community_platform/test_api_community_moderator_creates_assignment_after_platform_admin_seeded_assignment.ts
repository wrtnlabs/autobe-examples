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
 * Validate that community moderators can create additional moderator
 * assignments in a community that already has a seed moderator assignment
 * created by a platform administrator.
 *
 * Business goals:
 *
 * - Show that platformAdmin-driven governance seeding (initial moderator
 *   assignment) does not block self-governance flows via the communityModerator
 *   namespace.
 * - Ensure that both assignments for the same community can coexist and are
 *   independently active.
 * - Exercise multiple authorization actors (platformAdmin, memberUser,
 *   communityModerator) in one realistic workflow.
 */
export async function test_api_community_moderator_creates_assignment_after_platform_admin_seeded_assignment(
  connection: api.IConnection,
) {
  // 1. Register and implicitly authenticate a platform admin.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platformAdmin, create an "active" account status that allows all actions.
  const accountStatusCreateBody = {
    key: "ACTIVE",
    label: "Active",
    description: "Active account status allowing login, posting, and voting.",
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

  // 3. As platformAdmin, create a community visibility level.
  const visibilityCode = "public_" + RandomGenerator.alphaNumeric(8);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: "Publicly visible community.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code roundtrip",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. Register and authenticate a member user, then create a community.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Explicit login as member (even though join already authenticates) to
  // exercise login flow and ensure connection headers are updated.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  const communityCreateBody = {
    identifier: "community_" + RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.name(3),
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

  const communityIdentifier: string = community.identifier;
  TestValidator.equals(
    "community identifier roundtrip",
    communityIdentifier,
    communityCreateBody.identifier,
  );
  TestValidator.equals(
    "community visibility level code matches",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 5. Register two community moderator accounts that will be assigned.
  const moderatorAJoinBody = {
    username: "modA_" + RandomGenerator.alphaNumeric(6),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorAJoinBody,
    });
  typia.assert(moderatorAAuthorized);

  const moderatorBJoinBody = {
    username: "modB_" + RandomGenerator.alphaNumeric(6),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.2",
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorBAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorBJoinBody,
    });
  typia.assert(moderatorBAuthorized);

  const moderatorAId = moderatorAAuthorized.id;
  const moderatorBId = moderatorBAuthorized.id;

  // 6. Switch back to platformAdmin context and create seed assignment for moderator A.
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.10",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  const now = new Date();
  const assignedAtSeed = now.toISOString();

  const seedAssignmentBody = {
    communityModeratorId: moderatorAId,
    assignedAt: assignedAtSeed,
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const seedAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier,
        body: seedAssignmentBody,
      },
    );
  typia.assert(seedAssignment);

  TestValidator.equals(
    "seed assignment community id matches community",
    seedAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "seed assignment moderator matches moderator A",
    seedAssignment.communityModerator.id,
    moderatorAId,
  );
  TestValidator.predicate(
    "seed assignment isActive true",
    seedAssignment.isActive === true,
  );

  // 7. Switch to moderator A context and create a second assignment for moderator B.
  const moderatorALoginBody = {
    identifier: moderatorAJoinBody.email,
    password: moderatorAJoinBody.password,
    ip: "127.0.0.3",
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorALoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorALoginBody,
    });
  typia.assert(moderatorALoggedIn);

  const assignedAtSecond = new Date(now.getTime() + 1000).toISOString();

  const secondAssignmentBody = {
    communityModeratorId: moderatorBId,
    assignedAt: assignedAtSecond,
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const secondAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.communityModerator.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier,
        body: secondAssignmentBody,
      },
    );
  typia.assert(secondAssignment);

  // 8. Validate coexistence and invariants.
  TestValidator.equals(
    "second assignment community id matches community",
    secondAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "second assignment moderator matches moderator B",
    secondAssignment.communityModerator.id,
    moderatorBId,
  );
  TestValidator.predicate(
    "second assignment isActive true",
    secondAssignment.isActive === true,
  );

  TestValidator.equals(
    "seed and second assignments share same community",
    seedAssignment.community.id,
    secondAssignment.community.id,
  );

  TestValidator.notEquals(
    "seed and second assignments target different moderators",
    seedAssignment.communityModerator.id,
    secondAssignment.communityModerator.id,
  );

  TestValidator.predicate(
    "both assignments remain active",
    seedAssignment.isActive === true && secondAssignment.isActive === true,
  );
}
