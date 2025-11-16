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
 * Validate platform admin cross-community membership detail retrieval.
 *
 * Business goal: Ensure that a platform administrator can retrieve detailed
 * membership information for arbitrary member users across different
 * communities, and that the membership record returned for a given
 * (memberUserId, membershipId) pair is correct and self-consistent.
 *
 * High level steps:
 *
 * 1. Bootstrap a platformAdmin and create a visibility level master.
 * 2. Register two member users (A and B).
 * 3. As member user A, create Community X.
 * 4. As member user B, create Community Y.
 * 5. As a community moderator, create memberships:
 *
 *    - M_A_X: membership of A in X.
 *    - M_B_Y: membership of B in Y.
 * 6. As platformAdmin, fetch each membership via GET
 *    /communityPlatform/platformAdmin/memberUsers/{memberUserId}/communityMemberships/{membershipId}
 *    and verify that:
 *
 *    - The membership id matches.
 *    - The embedded memberuser summary matches the requested memberUserId.
 *    - The embedded community summary matches the community where the membership was
 *         created.
 *    - Lifecycle flags (is_active) are preserved.
 * 7. Cross-check that the two memberships are distinct and belong to different
 *    communities and member users.
 */
export async function test_api_platform_admin_membership_detail_cross_community_context(
  connection: api.IConnection,
) {
  // -------------------------------------------------------------------------
  // 1. PLATFORM ADMIN BOOTSTRAP & VISIBILITY LEVEL
  // -------------------------------------------------------------------------
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: "StrongPassword!123",
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Create a reusable visibility level for communities.
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: "Visibility level used for E2E membership detail tests",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // -------------------------------------------------------------------------
  // 2. MEMBER USERS A AND B
  // -------------------------------------------------------------------------
  // Member user A join
  const memberEmailA: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoinBodyA = {
    username: `userA_${RandomGenerator.alphabets(6)}`,
    email: memberEmailA,
    password: "MemberPassword!123",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBodyA,
    });
  typia.assert(memberAuthA);

  // Member user B join
  const memberEmailB: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoinBodyB = {
    username: `userB_${RandomGenerator.alphabets(6)}`,
    email: memberEmailB,
    password: "MemberPassword!123",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBodyB,
    });
  typia.assert(memberAuthB);

  // -------------------------------------------------------------------------
  // 3. COMMUNITY X (OWNED BY MEMBER USER A)
  // -------------------------------------------------------------------------
  // After join, Authorization is for member user B (last join). We must
  // switch to member user A explicitly via login.
  const memberLoginBodyA = {
    identifier: memberEmailA,
    password: "MemberPassword!123",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBodyA,
    });
  typia.assert(memberLoginA);

  const communityIdentifierX = `community-x-${RandomGenerator.alphabets(6)}`;
  const communityCreateBodyX = {
    identifier: communityIdentifierX,
    title: "Community X",
    description: "Community X created by member user A for E2E tests",
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityX: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBodyX },
    );
  typia.assert(communityX);

  // -------------------------------------------------------------------------
  // 4. COMMUNITY Y (OWNED BY MEMBER USER B)
  // -------------------------------------------------------------------------
  const memberLoginBodyB = {
    identifier: memberEmailB,
    password: "MemberPassword!123",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBodyB,
    });
  typia.assert(memberLoginB);

  const communityIdentifierY = `community-y-${RandomGenerator.alphabets(6)}`;
  const communityCreateBodyY = {
    identifier: communityIdentifierY,
    title: "Community Y",
    description: "Community Y created by member user B for E2E tests",
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityY: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBodyY },
    );
  typia.assert(communityY);

  // -------------------------------------------------------------------------
  // 5. COMMUNITY MODERATOR AND MEMBERSHIPS
  // -------------------------------------------------------------------------
  // Join as community moderator (also authenticates as moderator).
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const moderatorJoinBody = {
    username: `mod_${RandomGenerator.alphabets(8)}`,
    email: moderatorEmail,
    password: "ModeratorPassword!123",
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuth);

  // Create membership for member user A in community X.
  const membershipCreateBodyAInX = {
    memberuser_id: memberAuthA.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipAInX: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier: communityX.identifier,
        body: membershipCreateBodyAInX,
      },
    );
  typia.assert(membershipAInX);

  // Create membership for member user B in community Y.
  const membershipCreateBodyBInY = {
    memberuser_id: memberAuthB.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipBInY: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier: communityY.identifier,
        body: membershipCreateBodyBInY,
      },
    );
  typia.assert(membershipBInY);

  // -------------------------------------------------------------------------
  // 6. PLATFORM ADMIN: FETCH MEMBERSHIP DETAILS BY (memberUserId, membershipId)
  // -------------------------------------------------------------------------
  // Switch back to platform admin explicitly via login to ensure correct actor.
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: "StrongPassword!123",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // Fetch membership for user A in X.
  const fetchedMembershipAInX: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMemberships.at(
      connection,
      {
        memberUserId: memberAuthA.id,
        membershipId: membershipAInX.id,
      },
    );
  typia.assert(fetchedMembershipAInX);

  // Basic identity equality checks for membership A in X.
  TestValidator.equals(
    "platform admin fetch: membership A in X - id matches",
    fetchedMembershipAInX.id,
    membershipAInX.id,
  );

  TestValidator.equals(
    "platform admin fetch: membership A in X - memberuser id matches",
    fetchedMembershipAInX.memberuser.id,
    memberAuthA.id,
  );

  TestValidator.equals(
    "platform admin fetch: membership A in X - community id matches",
    fetchedMembershipAInX.community.id,
    membershipAInX.community.id,
  );

  TestValidator.equals(
    "platform admin fetch: membership A in X - is_active flag preserved",
    fetchedMembershipAInX.is_active,
    membershipAInX.is_active,
  );

  // Fetch membership for user B in Y.
  const fetchedMembershipBInY: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMemberships.at(
      connection,
      {
        memberUserId: memberAuthB.id,
        membershipId: membershipBInY.id,
      },
    );
  typia.assert(fetchedMembershipBInY);

  TestValidator.equals(
    "platform admin fetch: membership B in Y - id matches",
    fetchedMembershipBInY.id,
    membershipBInY.id,
  );

  TestValidator.equals(
    "platform admin fetch: membership B in Y - memberuser id matches",
    fetchedMembershipBInY.memberuser.id,
    memberAuthB.id,
  );

  TestValidator.equals(
    "platform admin fetch: membership B in Y - community id matches",
    fetchedMembershipBInY.community.id,
    membershipBInY.community.id,
  );

  TestValidator.equals(
    "platform admin fetch: membership B in Y - is_active flag preserved",
    fetchedMembershipBInY.is_active,
    membershipBInY.is_active,
  );

  // -------------------------------------------------------------------------
  // 7. CROSS-CHECK: DISTINCT MEMBERSHIPS AND COMMUNITIES
  // -------------------------------------------------------------------------
  TestValidator.notEquals(
    "memberships A-in-X and B-in-Y must have different ids",
    fetchedMembershipAInX.id,
    fetchedMembershipBInY.id,
  );

  TestValidator.notEquals(
    "memberships A-in-X and B-in-Y must belong to different communities",
    fetchedMembershipAInX.community.id,
    fetchedMembershipBInY.community.id,
  );

  TestValidator.notEquals(
    "memberships A-in-X and B-in-Y must belong to different member users",
    fetchedMembershipAInX.memberuser.id,
    fetchedMembershipBInY.memberuser.id,
  );
}
