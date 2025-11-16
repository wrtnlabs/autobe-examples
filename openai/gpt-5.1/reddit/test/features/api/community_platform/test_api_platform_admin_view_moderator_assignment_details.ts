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
 * Validate that a platform administrator can view full details of a specific
 * community moderator assignment scoped to the correct community.
 *
 * Business flow:
 *
 * 1. Join as a platform admin so that privileged platformAdmin endpoints can be
 *    used.
 * 2. As platform admin, create an account status master entry (ACTIVE-like) via
 *    accountStatuses.create.
 * 3. As platform admin, create a community visibility level (e.g., PUBLIC) via
 *    communityVisibilityLevels.create.
 * 4. Join as a member user and log in as that member to simulate a normal
 *    community creator.
 * 5. As the member user, create a community using the visibility level’s code, and
 *    capture its identifier/slug.
 * 6. Join as a community moderator to obtain a valid moderator id.
 * 7. Switch back to the platform admin using platformAdmin.login to perform
 *    privileged operations.
 * 8. As the platform admin, create a community moderator assignment for the new
 *    community, with isActive=true and an immediate assignedAt timestamp, and
 *    revokedAt unset/null.
 * 9. Call the GET
 *    /communityPlatform/platformAdmin/communities/{communityIdentifier}/moderatorAssignments/{moderatorAssignmentId}
 *    endpoint with the same community identifier and assignment id.
 * 10. Assert that the returned ICommunityPlatformCommunityModeratorAssignment:
 *
 *     - Has the same id as the created assignment
 *     - Has community.id and slug matching the created community’s identity
 *     - Has communityModerator.id equal to the moderator’s id
 *     - Has isActive === true
 *     - Has revokedAt === null (or is undefined, normalized to null)
 *     - Has deletedAt === null/undefined (not soft-deleted)
 * 11. Use typia.assert() for structural validation of all responses and
 *     TestValidator for business invariants around ids, activity flags, and
 *     correct scoping to the target community.
 */
export async function test_api_platform_admin_view_moderator_assignment_details(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin (join)
  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
        password: "P@ssw0rd!",
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://admin.console.local/join",
        referrer: "https://landing.local/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  // 2. As platform admin, create an ACTIVE-like account status
  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: "ACTIVE",
          label: "Active",
          description: "Active accounts can login, post, and vote.",
          isLoginAllowed: true,
          isPostingAllowed: true,
          isVotingAllowed: true,
          requiresManualReview: false,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(accountStatus);

  // 3. As platform admin, create a PUBLIC community visibility level
  const visibilityCode = "public";
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public",
          description: "Publicly visible community accessible to all users.",
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match requested code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. Join as a member user
  const memberEmail =
    `${RandomGenerator.alphabets(10)}@member.test.com` as string &
      tags.Format<"email">;
  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: memberEmail,
        password: "MemberP@ssw0rd!",
        ip: "127.0.0.1",
        href: "https://app.local/join",
        referrer: "https://app.local/landing",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  // 4-b. Explicitly log in as member user to simulate real-world flow
  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberEmail,
        password: "MemberP@ssw0rd!",
        ip: "127.0.0.1",
        href: "https://app.local/login",
        referrer: "https://app.local/join",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  // 5. As the member user, create a community using the visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: communityTitle,
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  TestValidator.equals(
    "community identifier should match request identifier",
    community.identifier,
    communityIdentifier,
  );

  // 6. Join as a community moderator
  const moderatorEmail =
    `${RandomGenerator.alphabets(10)}@moderator.test.com` as string &
      tags.Format<"email">;
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: "ModeratorP@ssw0rd!",
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://moderator.console.local/join",
        referrer: "https://moderator.console.local/landing",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderatorJoin);

  // 7. Switch back to platform admin via login
  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminJoin.email,
        password: "P@ssw0rd!",
        ip: "127.0.0.1",
        href: "https://admin.console.local/login",
        referrer: "https://admin.console.local/join",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminLogin);

  // 8. As platform admin, create a moderator assignment for the community
  const assignedAt = new Date().toISOString();
  const moderatorAssignmentCreateBody = {
    communityModeratorId: moderatorJoin.id,
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
  typia.assert<ICommunityPlatformCommunityModeratorAssignment>(
    createdAssignment,
  );

  // Basic invariants on created assignment
  TestValidator.equals(
    "created assignment community id should match community.id",
    createdAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "created assignment moderator id should match moderatorJoin.id",
    createdAssignment.communityModerator.id,
    moderatorJoin.id,
  );
  TestValidator.equals(
    "created assignment isActive should be true",
    createdAssignment.isActive,
    true,
  );

  // 9. Call the GET endpoint to fetch the assignment by id under the same community
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

  // 10-11. Validate that fetched assignment matches created one and is scoped correctly
  TestValidator.equals(
    "fetched assignment id should equal created assignment id",
    fetchedAssignment.id,
    createdAssignment.id,
  );
  TestValidator.equals(
    "fetched community id should equal created community id",
    fetchedAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "fetched community slug should equal requested community identifier",
    fetchedAssignment.community.slug,
    communityIdentifier,
  );
  TestValidator.equals(
    "fetched moderator id should equal created moderator id",
    fetchedAssignment.communityModerator.id,
    moderatorJoin.id,
  );
  TestValidator.equals(
    "fetched assignment isActive should be true",
    fetchedAssignment.isActive,
    true,
  );

  TestValidator.equals(
    "fetched assignment revokedAt should mirror created revokedAt (null expected)",
    fetchedAssignment.revokedAt ?? null,
    createdAssignment.revokedAt ?? null,
  );

  TestValidator.equals(
    "fetched assignment deletedAt should mirror created deletedAt (null for active)",
    fetchedAssignment.deletedAt ?? null,
    createdAssignment.deletedAt ?? null,
  );

  // Ensure that the assignment is indeed tied to the intended community and not some other one
  TestValidator.equals(
    "assignment community identifier (slug) should equal creation identifier",
    fetchedAssignment.community.slug,
    communityIdentifier,
  );
}
