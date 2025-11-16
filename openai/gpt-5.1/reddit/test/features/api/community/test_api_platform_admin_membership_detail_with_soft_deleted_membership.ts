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
 * Platform admin can inspect soft-deleted community memberships.
 *
 * Business purpose
 *
 * - Ensure that when a community membership is removed via the
 *   community-moderator DELETE endpoint, the membership row is soft-deleted
 *   (deleted_at is populated) rather than hard-deleted.
 * - Verify that platform administrators can still retrieve that membership via
 *   the dedicated memberUsers/communityMemberships detail endpoint for audit
 *   and compliance purposes.
 *
 * Steps
 *
 * 1. Register a platform admin using /auth/platformAdmin/join.
 * 2. As the platform admin, create a community visibility level using
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 3. Register a member user using /auth/memberUser/join.
 * 4. As the member user, create a community via
 *    /communityPlatform/memberUser/communities, referencing the visibility
 *    level code from step 2.
 * 5. As the member user, create a membership request in that community via
 *    /communityPlatform/memberUser/communities/{communityIdentifier}/membershipRequests.
 * 6. Register a community moderator using /auth/communityModerator/join.
 * 7. As the community moderator, create an active membership for the member user
 *    via
 *    /communityPlatform/communityModerator/communities/{communityIdentifier}/memberships.
 * 8. As the community moderator, delete that membership via
 *    /communityPlatform/communityModerator/communities/{communityIdentifier}/memberships/{membershipId}.
 * 9. Log back in as the platform admin via /auth/platformAdmin/login to ensure the
 *    Authorization context is platformAdmin.
 * 10. As platformAdmin, call
 *     /communityPlatform/platformAdmin/memberUsers/{memberUserId}/communityMemberships/{membershipId}.
 * 11. Assert that:
 *
 *     - The membership is returned successfully (typia.assert).
 *     - Membership.deleted_at is non-null (soft-deleted but auditable).
 *     - Membership.is_active is false.
 *     - Membership.memberuser.id matches the member user from step 3.
 *     - Membership.community.id and/or slug fields are consistent with the created
 *           community.
 */
export async function test_api_platform_admin_membership_detail_with_soft_deleted_membership(
  connection: api.IConnection,
) {
  // 1. Register platform admin (auto-authenticated by SDK)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: "Pa$w0rd-platform-admin",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platform admin, create a visibility level
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: "Visibility level for e2e membership soft-delete test.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);

  // 3. Register member user (auto-authenticated)
  const memberUserEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberUsername = `member_${RandomGenerator.alphabets(10)}`;

  const memberJoinBody = {
    username: memberUsername,
    email: memberUserEmail,
    password: "Pa$w0rd-member-user",
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 4. As member user, create a community
  const communityIdentifier = `e2e-community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "E2E Soft Delete Test Community",
    description:
      "Community created for testing soft-deleted membership detail visibility.",
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

  // 5. As member user, create a membership request for that community
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: "I would like to join this community for testing purposes.",
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);

  // 6. Register community moderator (auto-authenticated)
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const moderatorJoinBody = {
    username: `mod_${RandomGenerator.alphabets(10)}`,
    email: moderatorEmail,
    password: "Pa$w0rd-community-mod",
    display_name: "E2E Moderator",
    ip: null,
    href: "https://mod.example.com/signup",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 7. As community moderator, create an active membership for the member user
  const membershipCreateBody = {
    memberuser_id: memberUserId,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const createdMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(createdMembership);

  // Assert that the created membership matches expectations before deletion
  TestValidator.equals(
    "created membership belongs to expected member user",
    createdMembership.memberuser.id,
    memberUserId,
  );
  TestValidator.equals(
    "created membership community matches created community",
    createdMembership.community.id,
    community.id,
  );
  TestValidator.predicate(
    "created membership is initially active",
    createdMembership.is_active === true,
  );

  // 8. As community moderator, delete (soft-delete) the membership
  await api.functional.communityPlatform.communityModerator.communities.memberships.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      membershipId: createdMembership.id,
    },
  );

  // 9. Log back in as platform admin to ensure context is platformAdmin
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: "Pa$w0rd-platform-admin",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminReauthenticated: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminReauthenticated);

  // 10. As platformAdmin, fetch the soft-deleted membership detail
  const membershipDetail: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMemberships.at(
      connection,
      {
        memberUserId: memberUserId,
        membershipId: createdMembership.id,
      },
    );
  typia.assert(membershipDetail);

  // 11. Assertions about soft-deleted visibility and invariants
  TestValidator.equals(
    "platform admin detail returns same membership id",
    membershipDetail.id,
    createdMembership.id,
  );
  TestValidator.equals(
    "platform admin detail belongs to same member user",
    membershipDetail.memberuser.id,
    memberUserId,
  );
  TestValidator.equals(
    "platform admin detail community matches created community",
    membershipDetail.community.id,
    community.id,
  );

  TestValidator.predicate(
    "soft-deleted membership has non-null deleted_at",
    membershipDetail.deleted_at !== null &&
      membershipDetail.deleted_at !== undefined,
  );

  TestValidator.predicate(
    "soft-deleted membership is no longer active",
    membershipDetail.is_active === false,
  );
}
