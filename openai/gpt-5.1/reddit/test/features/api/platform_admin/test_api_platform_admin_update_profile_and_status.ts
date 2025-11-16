import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform admin can update another platform admin's profile
 * and account status.
 *
 * Business workflow covered:
 *
 * 1. Register platform admin A (initial actor) via /auth/platformAdmin/join.
 * 2. As admin A, create an account status via
 *    /communityPlatform/platformAdmin/accountStatuses.
 * 3. As admin A, create a community visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 4. Register and login a member user, then create a community to ensure community
 *    context exists.
 * 5. As admin A, register a second platform admin B whose profile will be updated.
 * 6. As admin A, call PUT
 *    /communityPlatform/platformAdmin/platformAdmins/{platformAdminId} to
 *    change B's username, email, displayName, and accountStatusId.
 * 7. Validate that mutable fields are updated, immutable fields (id, createdAt)
 *    remain the same, and accountStatus summary reflects the new status.
 */
export async function test_api_platform_admin_update_profile_and_status(
  connection: api.IConnection,
) {
  // 1. Register platform admin A (this also authenticates A via Authorization header side-effect).
  const adminAJoinBody = {
    username: `adminA_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Password123!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminA: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // 2. As admin A, create an account status for later use.
  const statusKey = `SUSPENDED_${RandomGenerator.alphaNumeric(6)}`;
  const accountStatusBody = {
    key: statusKey,
    label: "Suspended (E2E)",
    description: "Suspended status created by E2E test for platform admin.",
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusBody },
    );
  typia.assert(createdStatus);

  // 3. As admin A, create a new community visibility level.
  const visibilityCode = `restricted_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Restricted (E2E)",
    description: "Restricted visibility level created by E2E test.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 4. Register member user and create a community using the created visibility level.
  const memberJoinBody = {
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@member.test`,
    password: "Password123!",
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const communityBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: "E2E Test Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 5. As admin A, register platform admin B (this will overwrite Authorization header to B's token).
  const adminBJoinBody = {
    username: `adminB_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Password123!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/joinB",
    referrer: "https://admin.example.com/landingB",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminB: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  const originalAdminBId = adminB.id;
  const originalCreatedAt = adminB.createdAt;
  const originalUpdatedAt = adminB.updatedAt;

  // 6. Login back as admin A to perform the privileged update of admin B.
  const adminALoginBody = {
    identifier: adminA.email,
    password: adminAJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminALogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminALoginBody,
    });
  typia.assert(adminALogin);

  TestValidator.equals(
    "admin A login should refer to same admin id",
    adminALogin.id,
    adminA.id,
  );

  // 7. As admin A, update admin B's username, email, displayName and accountStatusId.
  const newUsername = `updatedB_${RandomGenerator.alphaNumeric(8)}`;
  const newEmail = `${RandomGenerator.alphaNumeric(8)}@updated.test` as string &
    tags.Format<"email">;
  const newDisplayName = RandomGenerator.name();

  const updateBody = {
    username: newUsername,
    email: newEmail,
    displayName: newDisplayName,
    accountStatusId: createdStatus.id,
  } satisfies ICommunityPlatformPlatformadmin.IUpdate;

  const updatedAdminB: ICommunityPlatformPlatformadmin =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.update(
      connection,
      {
        platformAdminId: originalAdminBId,
        body: updateBody,
      },
    );
  typia.assert(updatedAdminB);

  // 8. Validate updated fields vs original, immutability, and accountStatus summary.
  TestValidator.equals(
    "platform admin id must remain unchanged",
    updatedAdminB.id,
    originalAdminBId,
  );

  TestValidator.equals(
    "username must be updated",
    updatedAdminB.username,
    newUsername,
  );

  TestValidator.equals("email must be updated", updatedAdminB.email, newEmail);

  TestValidator.equals(
    "displayName must be updated",
    updatedAdminB.displayName ?? null,
    newDisplayName,
  );

  TestValidator.equals(
    "accountStatus summary id should match created status id",
    updatedAdminB.accountStatus.id,
    createdStatus.id,
  );

  TestValidator.equals(
    "accountStatus key should match created status key",
    updatedAdminB.accountStatus.key,
    createdStatus.key,
  );

  TestValidator.equals(
    "createdAt must remain unchanged",
    updatedAdminB.createdAt,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updatedAt should be same or later than original",
    new Date(updatedAdminB.updatedAt).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  // Sanity check that presence of community does not break admin update workflow.
  TestValidator.equals(
    "community visibility level code should remain as configured",
    community.visibilityLevel.code,
    visibilityCode,
  );
}
