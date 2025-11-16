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
 * Ensure that a community moderator cannot retrieve a moderator assignment that
 * belongs to a different community than the one they moderate.
 *
 * Business flow:
 *
 * 1. Platform admin joins (and becomes authenticated).
 * 2. Platform admin creates a reusable account status definition.
 * 3. Platform admin creates a reusable community visibility level.
 * 4. Member user joins and creates two communities: A and B.
 * 5. Platform admin logs in again to ensure admin context.
 * 6. Community moderator joins.
 * 7. Platform admin assigns this moderator only to Community A.
 * 8. Community moderator logs in.
 * 9. Sanity check: moderator can read the assignment for Community A.
 * 10. Negative check: moderator tries to read the same assignment but scoped under
 *     Community B; the call must fail with an error, demonstrating
 *     cross-community isolation.
 */
export async function test_api_community_moderator_forbidden_on_other_community_assignment(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = "AdminPassword!234";
  const platformAdminUsername: string = RandomGenerator.alphabets(12);

  const platformAdminJoinBody = {
    username: platformAdminUsername,
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create an account status (simple active-like status)
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active",
    description: "Active account status for test",
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

  // 3. Create a visibility level
  const visibilityCode: string = `public-${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public visibility",
    description: "Public community visibility for test",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Member user joins and creates two communities
  const memberUserEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberUserPassword: string = "MemberPassword!234";
  const memberUsername: string = RandomGenerator.alphabets(10);

  const memberJoinBody = {
    username: memberUsername,
    email: memberUserEmail,
    password: memberUserPassword,
    ip: null,
    href: "https://member.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Create Community A
  const communityAIdentifier: string = `community-a-${RandomGenerator.alphaNumeric(6)}`;
  const communityACreateBody = {
    identifier: communityAIdentifier,
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityACreateBody,
      },
    );
  typia.assert(communityA);

  // Create Community B
  const communityBIdentifier: string = `community-b-${RandomGenerator.alphaNumeric(6)}`;
  const communityBCreateBody = {
    identifier: communityBIdentifier,
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBCreateBody,
      },
    );
  typia.assert(communityB);

  // 5. Ensure we are back as platformAdmin (login again)
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.login.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  // 6. Community moderator joins
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword: string = "ModeratorPassword!234";
  const moderatorUsername: string = RandomGenerator.alphabets(11);

  const moderatorJoinBody = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://moderator.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 7. Platform admin assigns moderator only to Community A
  // (We are still admin from previous login.)
  const assignmentCreateBody = {
    communityModeratorId: moderatorAuthorized.id,
    assignedAt: new Date().toISOString(),
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const assignmentA: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: communityA.identifier,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignmentA);

  // 8. Community moderator logs in
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: null,
    href: "https://moderator.login.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginResult: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginResult);

  // 9. Sanity check: moderator can read assignment under Community A context
  const readAssignmentA: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.communityModerator.communities.moderatorAssignments.at(
      connection,
      {
        communityIdentifier: communityA.identifier,
        moderatorAssignmentId: assignmentA.id,
      },
    );
  typia.assert(readAssignmentA);

  TestValidator.equals(
    "sanity: moderator can read their own assignment in Community A",
    readAssignmentA.id,
    assignmentA.id,
  );
  TestValidator.equals(
    "sanity: assignment community identifier matches Community A",
    readAssignmentA.community.id,
    communityA.id,
  );

  // 10. Negative check: moderator tries to read the same assignment
  // under Community B's identifier. This must fail with some error.
  await TestValidator.error(
    "moderator cannot read assignment from other community (B)",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.moderatorAssignments.at(
        connection,
        {
          communityIdentifier: communityB.identifier,
          moderatorAssignmentId: assignmentA.id,
        },
      );
    },
  );
}
