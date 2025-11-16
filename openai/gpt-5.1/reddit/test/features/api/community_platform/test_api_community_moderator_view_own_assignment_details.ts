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
 * Community moderator views their own moderator assignment details.
 *
 * Business goal: Ensure that when a platform admin assigns a community
 * moderator to a community, the assigned moderator—authenticated as the
 * `communityModerator` actor—can retrieve the moderator assignment details for
 * that community via the communityModerator-scoped GET endpoint and see data
 * consistent with what was created through the platformAdmin API.
 *
 * End-to-end steps:
 *
 * 1. Platform admin joins (self-registers) and receives tokens.
 * 2. Platform admin creates an account status definition that can be used for
 *    moderator accounts (even if not directly wired here, it validates account
 *    status configuration path is working in this scenario chain).
 * 3. Platform admin creates a community visibility level (e.g., `public`).
 * 4. Member user joins and becomes authenticated.
 * 5. Member user creates a community using the created visibility level code and a
 *    unique identifier.
 * 6. Community moderator joins so there is a valid moderator actor row; capture
 *    moderator id and their credentials for later login.
 * 7. Switch back to platformAdmin via the login endpoint.
 * 8. Platform admin creates a moderator assignment for the community using POST
 *    /communityPlatform/platformAdmin/communities/{communityIdentifier}/moderatorAssignments
 *    with:
 *
 *    - CommunityIdentifier from the created community
 *    - CommunityModeratorId equal to the moderator id
 *    - AssignedAt set to now (ISO string)
 *    - RevokedAt explicitly null
 *    - IsActive true Capture the returned assignment object and its id.
 * 9. Switch authentication context to the communityModerator by calling
 *    /auth/communityModerator/login with the same credentials from step 6.
 * 10. As communityModerator, call GET
 *     /communityPlatform/communityModerator/communities/{communityIdentifier}/moderatorAssignments/{moderatorAssignmentId}
 *     using the same communityIdentifier and assignment id.
 * 11. Validate that the response is a valid
 *     ICommunityPlatformCommunityModeratorAssignment via typia.assert, and that
 *     key fields match the assignment created by the platform admin,
 *     including:
 *
 *     - Id
 *     - Community.id
 *     - CommunityModerator.id
 *     - IsActive
 *     - RevokedAt (null)
 *     - AssignedAt is equal to the one used in creation (or at least not later than
 *           it, depending on backend behavior).
 * 12. Use TestValidator.equals and TestValidator.predicate to assert equality and
 *     basic invariants without testing HTTP status codes or low-level error
 *     shapes.
 */
export async function test_api_community_moderator_view_own_assignment_details(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinHref: string & tags.Format<"uri"> =
    "https://admin.join.example.com" as string & tags.Format<"uri">;
  const platformAdminJoinReferrer: string & tags.Format<"uri"> =
    "https://admin.landing.example.com" as string & tags.Format<"uri">;

  const platformAdminPassword = "AdminPassw0rd!";

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: platformAdminJoinHref,
        referrer: platformAdminJoinReferrer,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates an account status definition
  const statusKey = "ACTIVE_MODERATOR_STATUS";
  const accountStatusCreateBody = {
    key: statusKey,
    label: "Active Moderator",
    description: "Account status for active community moderators in tests.",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdAccountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusCreateBody },
    );
  typia.assert(createdAccountStatus);

  TestValidator.equals(
    "created account status key should match",
    createdAccountStatus.key,
    statusKey,
  );

  // 3. Platform admin creates a visibility level
  const visibilityCode = "public_test_community";
  const visibilityName = "Public Test Community";

  const visibilityCreateBody = {
    code: visibilityCode,
    name: visibilityName,
    description: "Visibility level for public test communities.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const createdVisibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(createdVisibilityLevel);

  TestValidator.equals(
    "created visibility level code should match",
    createdVisibilityLevel.code,
    visibilityCode,
  );

  // 4. Member user joins
  const memberUserEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberUserPassword = "MemberPassw0rd!";

  const memberJoinHref: string & tags.Format<"uri"> =
    "https://member.join.example.com" as string & tags.Format<"uri">;
  const memberJoinReferrer: string & tags.Format<"uri"> =
    "https://member.landing.example.com" as string & tags.Format<"uri">;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberUserEmail,
        password: memberUserPassword,
        ip: "127.0.0.2",
        href: memberJoinHref,
        referrer: memberJoinReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAuthorized);

  // 5. Member user creates a community
  const communityIdentifier = `test-community-${RandomGenerator.alphaNumeric(8)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Moderator Assignment",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(createdCommunity);

  TestValidator.equals(
    "community identifier should match payload",
    createdCommunity.identifier,
    communityIdentifier,
  );

  // 6. Community moderator joins
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword = "ModeratorPassw0rd!";

  const moderatorJoinHref: string & tags.Format<"uri"> =
    "https://moderator.join.example.com" as string & tags.Format<"uri">;
  const moderatorJoinReferrer: string & tags.Format<"uri"> =
    "https://moderator.landing.example.com" as string & tags.Format<"uri">;

  const moderatorJoinOutput: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        ip: "127.0.0.3",
        href: moderatorJoinHref,
        referrer: moderatorJoinReferrer,
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorJoinOutput);

  const moderatorId = moderatorJoinOutput.id;

  // 7. Switch back to platform admin via login (explicit actor switch)
  const platformAdminLoginHref: string & tags.Format<"uri"> =
    "https://admin.login.example.com" as string & tags.Format<"uri">;
  const platformAdminLoginReferrer: string & tags.Format<"uri"> =
    "https://admin.login.referrer.example.com" as string & tags.Format<"uri">;

  const platformAdminLoginOutput: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: platformAdminPassword,
        ip: "127.0.0.1",
        href: platformAdminLoginHref,
        referrer: platformAdminLoginReferrer,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLoginOutput);

  TestValidator.equals(
    "platform admin login id should match join id",
    platformAdminLoginOutput.id,
    platformAdminAuthorized.id,
  );

  // 8. Platform admin creates moderator assignment for the community
  const assignedAt = new Date().toISOString();

  const assignmentCreateBody = {
    communityModeratorId: moderatorId,
    assignedAt,
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const createdAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: assignmentCreateBody,
      },
    );
  typia.assert(createdAssignment);

  TestValidator.equals(
    "created assignment community id should match community",
    createdAssignment.community.id,
    createdCommunity.id,
  );

  TestValidator.equals(
    "created assignment moderator id should match moderator",
    createdAssignment.communityModerator.id,
    moderatorId,
  );

  TestValidator.equals(
    "created assignment isActive should be true",
    createdAssignment.isActive,
    true,
  );

  TestValidator.equals(
    "created assignment revokedAt should be null",
    createdAssignment.revokedAt ?? null,
    null,
  );

  const assignmentId = createdAssignment.id;

  // 9. Switch to community moderator via login
  const moderatorLoginHref: string & tags.Format<"uri"> =
    "https://moderator.login.example.com" as string & tags.Format<"uri">;
  const moderatorLoginReferrer: string & tags.Format<"uri"> =
    "https://moderator.login.referrer.example.com" as string &
      tags.Format<"uri">;

  const moderatorLoginOutput: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        identifier: moderatorEmail,
        password: moderatorPassword,
        ip: "127.0.0.3",
        href: moderatorLoginHref,
        referrer: moderatorLoginReferrer,
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert(moderatorLoginOutput);

  TestValidator.equals(
    "moderator login id should match join id",
    moderatorLoginOutput.id,
    moderatorId,
  );

  // 10. As communityModerator, GET assignment details for their own assignment
  const fetchedAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.communityModerator.communities.moderatorAssignments.at(
      connection,
      {
        communityIdentifier: communityIdentifier,
        moderatorAssignmentId: assignmentId,
      },
    );
  typia.assert(fetchedAssignment);

  // 11. Validate consistency between created and fetched assignments
  TestValidator.equals(
    "fetched assignment id should match created assignment id",
    fetchedAssignment.id,
    assignmentId,
  );

  TestValidator.equals(
    "fetched assignment community id should match created community id",
    fetchedAssignment.community.id,
    createdCommunity.id,
  );

  TestValidator.equals(
    "fetched assignment moderator id should match moderator id",
    fetchedAssignment.communityModerator.id,
    moderatorId,
  );

  TestValidator.equals(
    "fetched assignment isActive should be true",
    fetchedAssignment.isActive,
    true,
  );

  TestValidator.equals(
    "fetched assignment revokedAt should remain null",
    fetchedAssignment.revokedAt ?? null,
    null,
  );

  TestValidator.predicate(
    "fetched assignedAt should match or be equal to created assignedAt",
    fetchedAssignment.assignedAt === createdAssignment.assignedAt,
  );

  // Basic deep consistency on key fields between platformAdmin and moderator views
  TestValidator.equals(
    "platformAdmin and moderator views should agree on core fields",
    {
      id: fetchedAssignment.id,
      isActive: fetchedAssignment.isActive,
      revokedAt: fetchedAssignment.revokedAt ?? null,
      communityId: fetchedAssignment.community.id,
      moderatorId: fetchedAssignment.communityModerator.id,
    },
    {
      id: createdAssignment.id,
      isActive: createdAssignment.isActive,
      revokedAt: createdAssignment.revokedAt ?? null,
      communityId: createdAssignment.community.id,
      moderatorId: createdAssignment.communityModerator.id,
    },
  );
}
