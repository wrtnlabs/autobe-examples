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
 * Validate that a platform administrator can deactivate a moderator assignment
 * with a revocation timestamp.
 *
 * Business flow:
 *
 * 1. Platform admin joins (authenticated as platformAdmin).
 * 2. Platform admin creates an account status master record.
 * 3. Platform admin creates a community visibility level.
 * 4. Member user joins and creates a community using the visibility level.
 * 5. Platform admin creates an active moderator assignment for that community.
 * 6. Platform admin updates the assignment to set is_active=false and revoked_at.
 * 7. Validate that the updated assignment is inactive, has revokedAt set,
 *    updatedAt has changed, and relationships are preserved.
 */
export async function test_api_moderator_assignment_update_inactive_with_revocation(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create an account status master record (for general consistency)
  const accountStatusBody = {
    key: "ACTIVE_MODERATOR_STATUS",
    label: "Active Moderator",
    description: "Status for active moderator and platform actors in tests.",
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

  // 3. Create a community visibility level
  const visibilityCode = "public_test_" + RandomGenerator.alphaNumeric(8);
  const visibilityBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: "Visibility level for E2E tests (public).",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityBody,
      },
    );
  typia.assert(visibility);

  // 4. Member user joins and creates a community
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // Now connection is authenticated as memberUser (SDK sets Authorization header).
  const communityIdentifier =
    "community_" + RandomGenerator.alphaNumeric(6).toLowerCase();

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Moderator Assignment",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier should match requested identifier",
    community.identifier,
    communityIdentifier,
  );

  // 5. Switch back to platform admin by logging in (explicit login flow)
  const platformAdminLoginBody = {
    identifier: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 6. Create an active moderator assignment for the community
  // Use random moderator id; in simulate mode typia.random will satisfy types.
  const communityModeratorId = typia.random<string & tags.Format<"uuid">>();

  const assignedAt = new Date().toISOString();

  const moderatorAssignmentCreateBody = {
    communityModeratorId,
    assignedAt,
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const createdAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: moderatorAssignmentCreateBody,
      },
    );
  typia.assert(createdAssignment);

  TestValidator.equals(
    "created assignment should be active initially",
    createdAssignment.isActive,
    true,
  );
  TestValidator.equals(
    "created assignment should have null revokedAt initially",
    createdAssignment.revokedAt,
    null,
  );

  const originalUpdatedAt = createdAssignment.updatedAt;

  // 7. Deactivate the assignment with a revocation timestamp via PUT update
  const revokedAt = new Date(Date.now() + 1000).toISOString();

  const moderatorAssignmentUpdateBody = {
    is_active: false,
    revoked_at: revokedAt,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.IUpdate;

  const updatedAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.update(
      connection,
      {
        communityIdentifier: community.identifier,
        moderatorAssignmentId: createdAssignment.id,
        body: moderatorAssignmentUpdateBody,
      },
    );
  typia.assert(updatedAssignment);

  // 8. Assertions: isActive false, revokedAt set and matches request, updatedAt changed
  TestValidator.equals(
    "updated assignment should be inactive",
    updatedAssignment.isActive,
    false,
  );

  TestValidator.predicate(
    "updated assignment revokedAt should be non-null",
    updatedAssignment.revokedAt !== null &&
      updatedAssignment.revokedAt !== undefined,
  );

  TestValidator.equals(
    "updated assignment revokedAt should match requested revoked_at",
    updatedAssignment.revokedAt,
    revokedAt,
  );

  TestValidator.notEquals(
    "updatedAt should change after update",
    updatedAssignment.updatedAt,
    originalUpdatedAt,
  );

  TestValidator.equals(
    "community linkage should be preserved after update",
    updatedAssignment.community.id,
    createdAssignment.community.id,
  );

  TestValidator.equals(
    "moderator linkage should be preserved after update",
    updatedAssignment.communityModerator.id,
    createdAssignment.communityModerator.id,
  );
}
