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
 * Validate creation of a community moderator assignment by a platform
 * administrator with all prerequisite master data and community records created
 * in the same workflow.
 *
 * Business flow implemented by this test:
 *
 * 1. Register a new platform administrator using /auth/platformAdmin/join, which
 *    also authenticates the platformAdmin actor and configures the SDK
 *    connection for subsequent platformAdmin calls.
 * 2. As the authenticated platformAdmin, create an account status master record
 *    via /communityPlatform/platformAdmin/accountStatuses with a deterministic
 *    ACTIVE-like key. The test does not directly attach this status to any
 *    actor, but verifies the master data creation successfully as part of the
 *    prerequisites.
 * 3. Still as the platformAdmin, create a community visibility level master record
 *    via /communityPlatform/platformAdmin/communityVisibilityLevels, with a
 *    deterministic code such as "public-test" that can be used by communities
 *    via visibilityLevelCode.
 * 4. Register a member user via /auth/memberUser/join to act as the community
 *    creator; this call also authenticates the memberUser actor and updates the
 *    shared connection to carry the memberUser access token.
 * 5. As the authenticated memberUser, create a new community via
 *    /communityPlatform/memberUser/communities, using the created visibility
 *    level code for visibilityLevelCode and a unique identifier slug for the
 *    community. Capture the returned community identifier
 *    (community.identifier) that will be used in the main target endpoint path
 *    parameter communityIdentifier.
 * 6. Switch the SDK connection back to the platformAdmin actor by calling
 *    /auth/platformAdmin/login with the original platformAdmin credentials.
 * 7. As the authenticated platformAdmin, call
 *    /communityPlatform/platformAdmin/communities/{communityIdentifier}/moderatorAssignments
 *    using
 *    api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create
 *    with:
 *
 *    - CommunityIdentifier set to the slug/identifier returned from the created
 *         community
 *    - Body satisfying ICommunityPlatformCommunityModeratorAssignment.ICreate with
 *         communityModeratorId set to a random UUID, isActive true and
 *         assignedAt set to now.
 * 8. Validate that the returned ICommunityPlatformCommunityModeratorAssignment
 *    object passes typia.assert, that its community.id matches the community we
 *    created, that isActive is true, and that assignedAt equals the requested
 *    value.
 *
 * Notes and constraints:
 *
 * - The test must not attempt to inspect HTTP status codes directly; it should
 *   rely on the SDK call succeeding (no thrown HttpError) as the indicator of
 *   success.
 * - The test must not touch or manipulate connection.headers directly;
 *   authentication context is controlled solely through the dedicated auth
 *   endpoints.
 * - Request DTOs must use "satisfies" for type checking instead of "as"
 *   assertions, and must populate all required fields while only using
 *   properties actually declared in the DTO types.
 * - No additional imports may be added; only the template imports are allowed.
 */
export async function test_api_platform_admin_create_moderator_assignment_with_fully_managed_prerequisites(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join) and obtain authorized admin context
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd-Admin",
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 2. As platformAdmin, create an account status master record
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(6).toUpperCase()}`,
    label: "Active Test Status",
    description:
      "Active status for moderator and admin accounts used in tests.",
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
  typia.assert<ICommunityPlatformAccountStatus>(accountStatus);

  // 3. As platformAdmin, create a community visibility level master record
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description:
      "Visibility level used by e2e tests to create publicly discoverable communities.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 4. Register a member user (join) to act as community creator
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.test`,
    password: "P@ssw0rd-Member",
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 5. As memberUser, create a community using the created visibility level code
  const communityIdentifier = `test-community-${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "E2E Test Community for Moderator Assignment",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  TestValidator.equals(
    "created community identifier matches requested identifier",
    community.identifier,
    communityIdentifier,
  );

  // 6. Switch back to platformAdmin actor using login with original credentials
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminLoggedIn,
  );

  // 7. As platformAdmin, create a moderator assignment for the created community
  const communityModeratorId = typia.random<string & tags.Format<"uuid">>();
  const nowIso = new Date().toISOString();

  const assignmentCreateBody = {
    communityModeratorId,
    assignedAt: nowIso,
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const assignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: assignmentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorAssignment>(assignment);

  // 8. Business assertions on the created moderator assignment
  TestValidator.equals(
    "assignment community id matches created community id",
    assignment.community.id,
    community.id,
  );

  TestValidator.equals(
    "assignment isActive flag should be true",
    assignment.isActive,
    true,
  );

  TestValidator.equals(
    "assignment assignedAt should equal requested assignedAt",
    assignment.assignedAt,
    assignmentCreateBody.assignedAt,
  );

  // A successful call without HttpError and the above business validations are
  // sufficient for this happy-path test.
}
