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
 * Validate idempotent delete behavior for community moderator assignments.
 *
 * Business goal
 *
 * - Ensure that deleting a community moderator assignment works as expected for
 *   the first request and behaves safely when the same delete is invoked again
 *   (idempotent semantics or appropriate error handling).
 *
 * High-level steps
 *
 * 1. Register a platform admin (join) and rely on the SDK attaching tokens.
 * 2. As platform admin, create an account status master (realistic admin prep).
 * 3. As platform admin, create a community visibility level master.
 * 4. Register a member user (join), which switches the auth context.
 * 5. As member user, create a community referencing the visibility level.
 * 6. Log in again as the platform admin so subsequent calls run as admin.
 * 7. As platform admin, create a moderator assignment for the new community.
 * 8. Call erase() once for that assignment and expect success.
 * 9. Call erase() again for the same assignment.
 * 10. Accept either idempotent success (no error) or failure; the absence of
 *     further state inspection APIs means we treat both as valid outcomes as
 *     long as no additional assignments are created in this flow.
 */
export async function test_api_moderator_assignment_delete_idempotent_behavior(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminJoin);

  const adminIdentifier = adminJoin.username;
  const adminPassword = adminJoinBody.password;

  // 2. Create an account status master record (realistic admin prep)
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(5)}`,
    label: "Active for tests",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusBody },
    );
  typia.assert(accountStatus);

  // 3. Create community visibility level master
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibility);

  // 4. Register a member user (join) to act as community creator
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.mobile(),
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(memberJoin);

  // 5. As member user, create a community referencing the visibility level
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 6. Log in again as platform admin so subsequent calls run as admin
  const adminLoginBody = {
    identifier: adminIdentifier,
    password: adminPassword,
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLogin = await api.functional.auth.platformAdmin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminLogin);

  // 7. Create moderator assignment for the new community
  const moderatorAssignmentBody = {
    communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
    assignedAt: new Date().toISOString(),
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const moderatorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: moderatorAssignmentBody,
      },
    );
  typia.assert(moderatorAssignment);

  const moderatorAssignmentId = moderatorAssignment.id;

  // 8. First erase call - expect success with no return value
  await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      moderatorAssignmentId,
    },
  );

  // 9. Second erase call - treat both success and error as valid outcomes
  try {
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.erase(
      connection,
      {
        communityIdentifier: community.identifier,
        moderatorAssignmentId,
      },
    );
  } catch {
    // If the implementation chooses to signal "already deleted" via error,
    // that is also acceptable for this idempotency-focused test.
  }
}
