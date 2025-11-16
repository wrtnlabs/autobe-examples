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
 * Verify that a platform administrator can toggle a moderator assignment's
 * active status to false for a specific community while preserving its
 * structural relationships.
 *
 * Business workflow covered by this test:
 *
 * 1. Platform admin registers (join) and becomes authenticated.
 * 2. Admin creates a community visibility level that will be referenced by
 *    communities.
 * 3. Admin creates an account status master record (for realistic domain setup).
 * 4. Member user registers and authenticates.
 * 5. Member user creates a community referencing the created visibility level.
 * 6. Platform admin logs back in to regain admin authorization.
 * 7. Admin creates a community moderator assignment with isActive=true for that
 *    community.
 * 8. Admin updates that assignment via PUT to set is_active=false and
 *    revoked_at=null.
 * 9. Test asserts that:
 *
 *    - The update succeeds with a valid
 *         ICommunityPlatformCommunityModeratorAssignment response.
 *    - IsActive flips from true to false.
 *    - Community and communityModerator linkage fields remain unchanged.
 *    - UpdatedAt is later than before the update.
 */
export async function test_api_moderator_assignment_update_toggle_active_status(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (registers) and becomes authenticated
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.test.local`,
    password: "AdminPassw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.test/join",
    referrer: "https://admin.console.test/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates a visibility level
  const visibilityCode = `public-e2e-${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public E2E Visibility",
    description:
      "Visibility level used for E2E moderator assignment toggle tests.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code must match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Admin creates at least one account status master record
  const accountStatusKey = `ACTIVE_${RandomGenerator.alphabets(6).toUpperCase()}`;
  const accountStatusCreateBody = {
    key: accountStatusKey,
    label: "Active (E2E)",
    description: "Account status used for E2E tests of moderator assignments.",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusCreateBody,
      },
    );
  typia.assert(accountStatus);
  TestValidator.equals(
    "created account status key must match request",
    accountStatus.key,
    accountStatusKey,
  );

  // 4. Member user joins and becomes authenticated
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.test.local` as string &
      tags.Format<"email">,
    password: "MemberPassw0rd!",
    ip: "127.0.0.1",
    href: "https://app.test.local/signup",
    referrer: "https://app.test.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Member user creates a community using the created visibility level code
  const communityIdentifier = `e2e-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "E2E Moderator Toggle Community",
    description:
      "Community created for testing moderator assignment active status toggling.",
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
  TestValidator.equals(
    "community identifier must match request",
    community.identifier,
    communityIdentifier,
  );

  // 6. Switch back to platform admin via login (using same credentials)
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.test/login",
    referrer: "https://admin.console.test/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 7. Admin creates a moderator assignment with isActive=true
  const moderatorAssignmentCreateBody = {
    communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
    assignedAt: new Date().toISOString() as string & tags.Format<"date-time">,
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const originalAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: moderatorAssignmentCreateBody,
      },
    );
  typia.assert(originalAssignment);

  TestValidator.equals(
    "created assignment must be active initially",
    originalAssignment.isActive,
    true,
  );

  const originalCommunityId = originalAssignment.community.id;
  const originalModeratorId = originalAssignment.communityModerator.id;
  const originalUpdatedAt = originalAssignment.updatedAt;

  // 8. Admin updates the assignment to set is_active=false and revoked_at=null
  const updateBody = {
    is_active: false,
    revoked_at: null,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.IUpdate;

  const updatedAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.update(
      connection,
      {
        communityIdentifier: community.identifier,
        moderatorAssignmentId: originalAssignment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAssignment);

  // 9. Assertions on update result
  TestValidator.equals(
    "assignment isActive flag should be toggled to false",
    updatedAssignment.isActive,
    false,
  );

  TestValidator.equals(
    "community linkage must remain unchanged",
    updatedAssignment.community.id,
    originalCommunityId,
  );

  TestValidator.equals(
    "communityModerator linkage must remain unchanged",
    updatedAssignment.communityModerator.id,
    originalModeratorId,
  );

  TestValidator.predicate(
    "updatedAt must be later than original updatedAt after toggle",
    () => updatedAssignment.updatedAt > originalUpdatedAt,
  );
}
