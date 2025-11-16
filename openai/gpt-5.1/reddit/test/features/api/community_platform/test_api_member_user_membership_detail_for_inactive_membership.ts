import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a member user can view details of an inactive community
 * membership.
 *
 * Business goal:
 *
 * - Once a member leaves or is removed from a community (membership inactivated),
 *   the owning member should still be able to inspect that membership record
 *   through the memberUser membership-detail endpoint.
 * - The membership lifecycle fields must correctly indicate the inactive state
 *   (is_active === false and ended_at populated) while still maintaining links
 *   to the correct community and member user.
 *
 * End-to-end steps:
 *
 * 1. Register a member user via /auth/memberUser/join and capture their id and
 *    credentials.
 * 2. Register a platform admin via /auth/platformAdmin/join and switch context to
 *    platformAdmin.
 * 3. As platformAdmin, create a community visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 4. Switch context back to the member user via /auth/memberUser/login.
 * 5. As member user, create a community using
 *    /communityPlatform/memberUser/communities with the visibility level code.
 * 6. As member user, create a membership request for that community via
 *    /communityPlatform/memberUser/communities/{communityIdentifier}/membershipRequests.
 * 7. Register a community moderator via /auth/communityModerator/join and log in
 *    as that moderator.
 * 8. As communityModerator, create an active membership for the member user via
 *    /communityPlatform/communityModerator/communities/{communityIdentifier}/memberships
 *    (is_active = true). Capture membership id and joined_at.
 * 9. Still as communityModerator, update that membership via
 *    /communityPlatform/communityModerator/communities/{communityIdentifier}/memberships/{membershipId}
 *    with IUpdate { is_active: false } to mark it inactive. The backend manages
 *    ended_at.
 * 10. Switch context back to the original member user via /auth/memberUser/login.
 * 11. Call the target endpoint
 *     /communityPlatform/memberUser/memberUsers/{memberUserId}/communityMemberships/{membershipId}.
 * 12. Assert that:
 *
 *     - The call succeeds and returns a valid ICommunityPlatformCommunityMembership.
 *     - Is_active is false.
 *     - Ended_at is non-null.
 *     - Memberuser.id equals the member user's id.
 *     - Community.id matches the created community.
 *     - Joined_at is unchanged compared with the original membership creation.
 */
export async function test_api_member_user_membership_detail_for_inactive_membership(
  connection: api.IConnection,
) {
  // 1. Register member user
  const memberPassword = "Password123!";
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(12);

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 2. Register platform admin
  const adminPassword = "AdminPassword123!";
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphabets(10);

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: "203.0.113.10",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 3. As platformAdmin, create visibility level
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "E2E Test Visibility",
    description: "Visibility level created for E2E membership detail test",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. Switch back to member user via login
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: "198.51.100.20",
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  TestValidator.equals(
    "member login id should equal join id",
    memberLoginAuthorized.id,
    memberUserId,
  );

  // 5. As member user, create a community
  const communityIdentifier = `comm-${RandomGenerator.alphaNumeric(10)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  const communityId = community.id;

  TestValidator.equals(
    "community identifier should match request",
    community.identifier,
    communityIdentifier,
  );

  // 6. As member user, create a membership request
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);

  TestValidator.equals(
    "membership request community id should match community",
    membershipRequest.community.id,
    communityId,
  );

  TestValidator.equals(
    "membership request requester member user id should match",
    membershipRequest.requesterMemberUser.id,
    memberUserId,
  );

  // 7. Register and log in a community moderator
  const moderatorPassword = "ModeratorPass123!";
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);

  const moderatorJoinBody = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: "192.0.2.50",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: "192.0.2.51",
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/dashboard",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  TestValidator.equals(
    "moderator id should remain consistent between join and login",
    moderatorLoginAuthorized.id,
    moderatorAuthorized.id,
  );

  // 8. As communityModerator, create an active membership for member user
  const createMembershipBody = {
    memberuser_id: memberUserId,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const createdMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: createMembershipBody,
      },
    );
  typia.assert(createdMembership);

  const membershipId = createdMembership.id;
  const joinedAtInitial = createdMembership.joined_at;

  TestValidator.equals(
    "created membership should be active initially",
    createdMembership.is_active,
    true,
  );

  TestValidator.equals(
    "created membership member user id should match",
    createdMembership.memberuser.id,
    memberUserId,
  );

  TestValidator.equals(
    "created membership community id should match",
    createdMembership.community.id,
    communityId,
  );

  // 9. As communityModerator, deactivate the membership (is_active = false)
  const updateMembershipBody = {
    is_active: false,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const updatedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.update(
      connection,
      {
        communityIdentifier: communityIdentifier,
        membershipId: membershipId,
        body: updateMembershipBody,
      },
    );
  typia.assert(updatedMembership);

  TestValidator.equals(
    "updated membership id should equal created id",
    updatedMembership.id,
    membershipId,
  );

  TestValidator.equals(
    "membership should now be inactive after update",
    updatedMembership.is_active,
    false,
  );

  TestValidator.equals(
    "joined_at should remain unchanged after deactivation",
    updatedMembership.joined_at,
    joinedAtInitial,
  );

  TestValidator.predicate(
    "ended_at should be set when membership is inactive",
    updatedMembership.ended_at !== null &&
      updatedMembership.ended_at !== undefined,
  );

  // 10. Switch context back to member user via login
  const memberLoginAfterUpdateBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: "198.51.100.21",
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/membership",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedAfterUpdate: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginAfterUpdateBody,
    });
  typia.assert(memberAuthorizedAfterUpdate);

  TestValidator.equals(
    "member id after update login should remain same",
    memberAuthorizedAfterUpdate.id,
    memberUserId,
  );

  // 11. Call target endpoint as member user
  const membershipDetail: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.memberUsers.communityMemberships.at(
      connection,
      {
        memberUserId: memberUserId,
        membershipId: membershipId,
      },
    );
  typia.assert(membershipDetail);

  // 12. Final assertions on inactive membership detail
  TestValidator.equals(
    "detail membership id should match",
    membershipDetail.id,
    membershipId,
  );

  TestValidator.equals(
    "detail membership should be inactive",
    membershipDetail.is_active,
    false,
  );

  TestValidator.predicate(
    "detail membership ended_at must be non-null when inactive",
    membershipDetail.ended_at !== null &&
      membershipDetail.ended_at !== undefined,
  );

  TestValidator.equals(
    "detail membership member user id should match owner",
    membershipDetail.memberuser.id,
    memberUserId,
  );

  TestValidator.equals(
    "detail membership community id should match created community",
    membershipDetail.community.id,
    communityId,
  );

  TestValidator.equals(
    "detail membership joined_at should equal original joined_at",
    membershipDetail.joined_at,
    joinedAtInitial,
  );
}
