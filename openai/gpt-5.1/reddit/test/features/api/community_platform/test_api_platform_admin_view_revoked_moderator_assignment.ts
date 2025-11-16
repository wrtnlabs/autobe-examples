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

export async function test_api_platform_admin_view_revoked_moderator_assignment(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin (join yields authorized admin + token)
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/register",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 2. As platform admin, create an account status definition
  const accountStatusBody = {
    key: "ACTIVE_MODERATOR_STATUS_" + RandomGenerator.alphabets(6),
    label: "Active Moderator",
    description: "Status that allows login and full moderator actions.",
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
  typia.assert<ICommunityPlatformAccountStatus>(accountStatus);

  // 3. As platform admin, create a community visibility level
  const visibilityCode =
    "public-" + RandomGenerator.alphaNumeric(8).toLowerCase();
  const visibilityBody = {
    code: visibilityCode,
    name: "Public - " + RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 4. Register and authenticate a member user who will create the community
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberP@ssw0rd",
    ip: "192.168.0.10",
    href: "https://app.local/signup",
    referrer: "https://app.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 5. As member user, create a community using the created visibility code
  const communityIdentifier =
    "community-" + RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 6. Register a community moderator account
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModeratorP@ss1",
    display_name: RandomGenerator.name(),
    ip: "10.0.0.5",
    href: "https://mod.app.local/signup",
    referrer: "https://mod.app.local/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorized,
  );

  // 7. Switch back to platform admin via explicit login
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminLogin);

  // 8. As platform admin, create a moderator assignment for the community
  const assignedAt = new Date().toISOString();

  const assignmentCreateBody = {
    communityModeratorId: moderatorAuthorized.id,
    assignedAt,
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const createdAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: assignmentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorAssignment>(
    createdAssignment,
  );

  // 9. Revoke the moderator assignment via update (mark inactive and set revoked_at)
  const revokedAt = new Date().toISOString();

  const assignmentUpdateBody = {
    is_active: false,
    revoked_at: revokedAt,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.IUpdate;

  const updatedAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.update(
      connection,
      {
        communityIdentifier: community.identifier,
        moderatorAssignmentId: createdAssignment.id as string &
          tags.Format<"uuid">,
        body: assignmentUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorAssignment>(
    updatedAssignment,
  );

  // Basic sanity checks on updated assignment state before GET
  TestValidator.equals(
    "updated assignment id should match created assignment id",
    updatedAssignment.id,
    createdAssignment.id,
  );
  TestValidator.predicate(
    "updated assignment should be inactive",
    updatedAssignment.isActive === false,
  );
  TestValidator.predicate(
    "updated assignment should have revokedAt set",
    updatedAssignment.revokedAt !== null &&
      updatedAssignment.revokedAt !== undefined,
  );

  // 10. Retrieve the moderator assignment via GET as platform admin
  const fetchedAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.at(
      connection,
      {
        communityIdentifier: community.identifier,
        moderatorAssignmentId: createdAssignment.id,
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorAssignment>(
    fetchedAssignment,
  );

  // 11. Validate that fetched assignment reflects revoked state and correct relations
  TestValidator.equals(
    "fetched assignment id matches created assignment id",
    fetchedAssignment.id,
    createdAssignment.id,
  );

  TestValidator.equals(
    "fetched assignment isActive should be false after revocation",
    fetchedAssignment.isActive,
    false,
  );

  TestValidator.predicate(
    "fetched assignment revokedAt is present",
    fetchedAssignment.revokedAt !== null &&
      fetchedAssignment.revokedAt !== undefined,
  );

  TestValidator.equals(
    "fetched assignment revokedAt should match the value used in update when possible",
    fetchedAssignment.revokedAt,
    revokedAt,
  );

  // Validate community relation
  TestValidator.equals(
    "assignment community id should match created community id",
    fetchedAssignment.community.id,
    community.id,
  );

  TestValidator.predicate(
    "assignment community summary should have non-empty name/slug",
    fetchedAssignment.community.name.length > 0 &&
      fetchedAssignment.community.slug.length > 0,
  );

  // Validate moderator relation
  TestValidator.equals(
    "assignment moderator id should match created moderator id",
    fetchedAssignment.communityModerator.id,
    moderatorAuthorized.id,
  );

  TestValidator.predicate(
    "assignment moderator username and email should be non-empty",
    fetchedAssignment.communityModerator.username.length > 0 &&
      fetchedAssignment.communityModerator.email.length > 0,
  );

  // Governance / audit visibility: even revoked assignments remain readable
  TestValidator.predicate(
    "revoked assignment should still be readable for governance and audit",
    fetchedAssignment.isActive === false &&
      fetchedAssignment.revokedAt !== null &&
      fetchedAssignment.revokedAt !== undefined,
  );
}
