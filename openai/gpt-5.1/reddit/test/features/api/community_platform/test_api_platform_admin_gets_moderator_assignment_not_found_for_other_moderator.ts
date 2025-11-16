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

export async function test_api_platform_admin_gets_moderator_assignment_not_found_for_other_moderator(
  connection: api.IConnection,
) {
  // 1. Register and auto-authenticate a platformAdmin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminUsername: string = RandomGenerator.alphabets(12);
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://admin.example.com/register",
        referrer: "https://admin.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 2. Create an account status as platform admin
  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: "ACTIVE_MODERATOR_STATUS_" + RandomGenerator.alphaNumeric(8),
          label: "Active moderator status",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          isLoginAllowed: true,
          isPostingAllowed: true,
          isVotingAllowed: true,
          requiresManualReview: false,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(accountStatus);

  // 3. Create a visibility level
  const visibilityCode: string = "public_" + RandomGenerator.alphaNumeric(8);

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public visibility " + RandomGenerator.alphabets(5),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 4. Register and auto-authenticate a memberUser
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(16);

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: memberEmail,
        password: memberPassword,
        ip: "127.0.0.1",
        href: "https://app.example.com/register",
        referrer: "https://app.example.com/",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  // 5. As memberUser, create a community
  const communityIdentifier: string =
    "community_" + RandomGenerator.alphaNumeric(8);

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: "Test Community " + RandomGenerator.alphabets(6),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 6. Switch back to platformAdmin via login to ensure actor context
  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: adminEmail,
        password: adminPassword,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminLogin);

  // 7. Create two moderator assignments for different moderators in the same community
  const assignmentA: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
          assignedAt: new Date().toISOString(),
          revokedAt: null,
          isActive: true,
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorAssignment>(assignmentA);

  const assignmentB: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
          assignedAt: new Date().toISOString(),
          revokedAt: null,
          isActive: true,
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorAssignment>(assignmentB);

  const moderatorAId: string = assignmentA.communityModerator.id;
  const moderatorBId: string = assignmentB.communityModerator.id;
  const assignmentAId: string = assignmentA.id;
  const assignmentBId: string = assignmentB.id;

  // Sanity: ensure moderator IDs and assignment IDs are distinct where expected
  TestValidator.notEquals(
    "moderator A and B must differ",
    moderatorAId,
    moderatorBId,
  );
  TestValidator.notEquals(
    "assignment A and B must differ",
    assignmentAId,
    assignmentBId,
  );

  // 8. Negative test: mismatched moderator + assignment pair must result in an error
  await TestValidator.error(
    "platform admin cannot fetch moderator B's assignment via moderator A's id",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityModerators.assignments.at(
        connection,
        {
          communityModeratorId: moderatorAId,
          moderatorAssignmentId: assignmentBId,
        },
      );
    },
  );

  // 9. Positive control: correct moderator + assignment pair succeeds
  const fetchedA: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communityModerators.assignments.at(
      connection,
      {
        communityModeratorId: moderatorAId,
        moderatorAssignmentId: assignmentAId,
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorAssignment>(fetchedA);

  TestValidator.equals(
    "fetched assignment A id matches original",
    fetchedA.id,
    assignmentAId,
  );
}
