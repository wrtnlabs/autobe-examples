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

export async function test_api_moderator_assignment_update_set_revoked_at(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (also authenticates as that admin)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create an account status (for completeness of master data)
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusBody },
    );
  typia.assert(accountStatus);

  // 3. Create a community visibility level to be used by the community
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 4. Register a member user (also authenticates as that member user)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. As the member user, create a community using the created visibility code
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
      { body: communityBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier should match request",
    community.identifier,
    communityIdentifier,
  );

  // 6. Log back in as the platform admin to perform moderator assignment admin operations
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAfterLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAfterLogin);

  TestValidator.equals(
    "platform admin id stable across join and login",
    platformAdminAfterLogin.id,
    platformAdminAuthorized.id,
  );

  // 7. Create a moderator assignment for the community.
  // We do not have APIs to create a real community moderator, so we use a random UUID
  // for communityModeratorId, focusing on the assignment update behavior.
  const createAssignmentBody = {
    communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
    assignedAt: new Date().toISOString(),
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const beforeUpdate: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: createAssignmentBody,
      },
    );
  typia.assert(beforeUpdate);

  TestValidator.equals(
    "created assignment is active",
    beforeUpdate.isActive,
    true,
  );

  TestValidator.equals(
    "created assignment revokedAt initially null",
    beforeUpdate.revokedAt ?? null,
    null,
  );

  // 8. Prepare a future revocation timestamp and update body keeping is_active true
  const futureRevokedAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour in the future

  const updateBody = {
    is_active: true,
    revoked_at: futureRevokedAt,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.IUpdate;

  const afterUpdate: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.update(
      connection,
      {
        communityIdentifier: community.identifier,
        moderatorAssignmentId: beforeUpdate.id,
        body: updateBody,
      },
    );
  typia.assert(afterUpdate);

  // 9. Validate that mutable fields changed appropriately and immutable links remained stable
  TestValidator.equals(
    "assignment id should remain unchanged",
    afterUpdate.id,
    beforeUpdate.id,
  );

  TestValidator.equals(
    "community link should remain unchanged",
    afterUpdate.community.id,
    beforeUpdate.community.id,
  );

  TestValidator.equals(
    "community moderator link should remain unchanged",
    afterUpdate.communityModerator.id,
    beforeUpdate.communityModerator.id,
  );

  if (beforeUpdate.assignedByPlatformAdmin !== undefined) {
    TestValidator.equals(
      "assignedByPlatformAdmin linkage should remain stable",
      afterUpdate.assignedByPlatformAdmin ?? null,
      beforeUpdate.assignedByPlatformAdmin ?? null,
    );
  }

  TestValidator.equals(
    "assignment should remain active after update",
    afterUpdate.isActive,
    true,
  );

  TestValidator.equals(
    "revokedAt should be updated to future timestamp",
    afterUpdate.revokedAt ?? null,
    futureRevokedAt,
  );

  TestValidator.equals(
    "assignedAt should remain unchanged",
    afterUpdate.assignedAt,
    beforeUpdate.assignedAt,
  );

  TestValidator.equals(
    "createdAt should remain unchanged",
    afterUpdate.createdAt,
    beforeUpdate.createdAt,
  );
}
