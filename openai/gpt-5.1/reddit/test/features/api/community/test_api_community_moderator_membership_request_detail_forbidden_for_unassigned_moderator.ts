import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Ensure an unassigned community moderator cannot read membership request
 * detail.
 *
 * Business context
 *
 * - Communities can require membership approval.
 * - Membership requests are reviewable by community moderators assigned to that
 *   community, or platform admins.
 * - A community moderator that is not assigned to a given community must not be
 *   able to access that community's membership requests via the
 *   moderator-facing endpoint.
 *
 * Test flow
 *
 * 1. Onboard a platform admin via /auth/platformAdmin/join.
 * 2. As platform admin, create a community visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 3. Onboard a member user via /auth/memberUser/join.
 * 4. Switch to member user (implicit after join) and create Community A via
 *    /communityPlatform/memberUser/communities with the created visibility
 *    level code.
 * 5. As the same member user, create a membership request in Community A via
 *    /communityPlatform/memberUser/communities/{communityIdentifier}/membershipRequests,
 *    capturing membershipRequestId and communityIdentifier.
 * 6. Onboard two community moderators (Moderator A and Moderator B) via
 *    /auth/communityModerator/join (separate credentials & emails).
 * 7. Switch back to platform admin via /auth/platformAdmin/login.
 * 8. Assign only Moderator A to Community A via
 *    /communityPlatform/platformAdmin/communities/{communityIdentifier}/moderatorAssignments
 *    using Moderator A's id in
 *    ICommunityPlatformCommunityModeratorAssignment.ICreate.
 * 9. Switch to Moderator B via /auth/communityModerator/login.
 * 10. As Moderator B (unassigned to Community A), attempt to read the membership
 *     request detail via GET
 *     /communityPlatform/communityModerator/communities/{communityIdentifier}/membershipRequests/{membershipRequestId}
 *     using
 *     api.functional.communityPlatform.communityModerator.communities.membershipRequests.at.
 *
 * Assertions
 *
 * - All setup calls (join, create visibility level, create community, create
 *   membership request, join moderators, create moderator assignment) succeed
 *   and return correctly typed DTOs validated via typia.assert.
 * - The forbidden access call as Moderator B is wrapped with await
 *   TestValidator.error and throws an error – we assert only that an error
 *   happens, not its status.
 * - No ICommunityPlatformCommunityMembershipRequest instance is obtained from the
 *   forbidden call.
 */
export async function test_api_community_moderator_membership_request_detail_forbidden_for_unassigned_moderator(
  connection: api.IConnection,
) {
  // 1. Register platform admin (auto-auth as platformAdmin)
  const platformAdminPassword = RandomGenerator.alphaNumeric(12);
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();

  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  // 2. Create visibility level as platformAdmin
  const visibilityCode = `vis-${RandomGenerator.alphabets(8)}`;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Test Visibility",
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register member user (auto-auth as memberUser)
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberEmail = typia.random<string & tags.Format<"email">>();

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: memberEmail,
        password: memberPassword,
        ip: null,
        href: "https://app.example.com/signup",
        referrer: "https://app.example.com/home",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  // 4. Member creates Community A
  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Member creates a membership request in Community A
  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          questionKey: "why_join",
          answerText: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate,
      },
    );
  typia.assert(membershipRequest);

  // 6. Register two community moderators (Moderator A & B)
  // Moderator A join (auto-auth as Moderator A)
  const moderatorAPassword = RandomGenerator.alphaNumeric(12);
  const moderatorAEmail = typia.random<string & tags.Format<"email">>();

  const moderatorAJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: `modA_${RandomGenerator.alphabets(6)}`,
        email: moderatorAEmail,
        password: moderatorAPassword,
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://mod.example.com/joinA",
        referrer: "https://mod.example.com/landing",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorAJoin);
  const moderatorAId = moderatorAJoin.id;

  // Moderator B join (auto-auth as Moderator B)
  const moderatorBPassword = RandomGenerator.alphaNumeric(12);
  const moderatorBEmail = typia.random<string & tags.Format<"email">>();

  const moderatorBJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: `modB_${RandomGenerator.alphabets(6)}`,
        email: moderatorBEmail,
        password: moderatorBPassword,
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://mod.example.com/joinB",
        referrer: "https://mod.example.com/landing",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorBJoin);

  // 7. Switch back to platformAdmin and assign only Moderator A to Community A
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminEmail,
      password: platformAdminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const assignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          communityModeratorId: moderatorAId,
          assignedAt: new Date().toISOString(),
          revokedAt: null,
          isActive: true,
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // 8. Switch to Moderator B (unassigned to Community A)
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorBEmail,
      password: moderatorBPassword,
      ip: null,
      href: "https://mod.example.com/loginB",
      referrer: "https://mod.example.com/landing",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  // 9. Attempt to read membership request detail as unassigned moderator
  await TestValidator.error(
    "unassigned moderator must not access membership request detail",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.membershipRequests.at(
        connection,
        {
          communityIdentifier: community.identifier,
          membershipRequestId: membershipRequest.id,
        },
      );
    },
  );
}
