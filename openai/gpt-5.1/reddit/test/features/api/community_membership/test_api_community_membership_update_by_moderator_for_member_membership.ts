import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that a community moderator can deactivate a member's community
 * membership in a community they moderate, and that the update keeps core
 * associations consistent.
 *
 * Business workflow:
 *
 * 1. Register a memberUser account (subject of the membership) via
 *    auth/memberUser/join.
 * 2. Register a communityModerator account via auth/communityModerator/join.
 * 3. Register a platformAdmin account via auth/platformAdmin/join.
 * 4. As platformAdmin, create a visibility level via
 *    communityPlatform/platformAdmin/communityVisibilityLevels.create.
 * 5. As memberUser, create a community using
 *    communityPlatform/memberUser/communities.create with that visibility
 *    level.
 * 6. As communityModerator, create a membership for the member user in that
 *    community using
 *    communityPlatform/communityModerator/communities.memberships.create with
 *    ICommunityPlatformCommunityMembership.ICreate.
 * 7. As communityModerator, update the membership using
 *    communityPlatform/communityModerator/communities.memberships.update with
 *    ICommunityPlatformCommunityMembership.IUpdate to set is_active from true
 *    to false.
 *
 * Validations:
 *
 * - Each API call returns a properly typed DTO validated by typia.assert().
 * - The updated membership response has is_active === false.
 * - The membership id remains the same between create and update.
 * - The community association in the membership (community.id) still matches the
 *   created community id.
 * - The memberuser association in the membership (memberuser.id) still matches
 *   the memberUser id.
 * - A second update can reactivate the membership (is_active from false back to
 *   true), and the response reflects that.
 */
export async function test_api_community_membership_update_by_moderator_for_member_membership(
  connection: api.IConnection,
) {
  // 1. Register member user (subject of membership)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!",
    ip: RandomGenerator.mobile(), // simple string as IP placeholder
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser);

  // 2. Register community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@moderator.example.com`,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderator);

  // 3. Register platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 4. As platformAdmin, create a visibility level
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);
  TestValidator.equals(
    "visibility level code matches",
    visibilityLevel.code,
    visibilityCode,
  );

  // 5. As memberUser, create a community using that visibility level code
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: memberJoinBody.ip ?? undefined,
      href: memberJoinBody.href,
      referrer: memberJoinBody.referrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityIdentifier,
  );

  // 6. As communityModerator, create a membership for the member user
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoinBody.email,
      password: moderatorJoinBody.password,
      ip: moderatorJoinBody.ip,
      href: moderatorJoinBody.href,
      referrer: moderatorJoinBody.referrer,
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const membershipCreateBody = {
    memberuser_id: memberUser.id,
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
  typia.assert<ICommunityPlatformCommunityMembership>(createdMembership);

  TestValidator.equals(
    "created membership community matches community id",
    createdMembership.community.id,
    community.id,
  );
  TestValidator.equals(
    "created membership member user matches member id",
    createdMembership.memberuser.id,
    memberUser.id,
  );
  TestValidator.equals(
    "created membership is_active true",
    createdMembership.is_active,
    true,
  );

  // 7. As communityModerator, update the membership to deactivate it
  const membershipUpdateBodyDeactivate = {
    is_active: false,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const deactivatedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: createdMembership.id,
        body: membershipUpdateBodyDeactivate,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(deactivatedMembership);

  // Validations after deactivation
  TestValidator.equals(
    "membership id preserved after deactivation",
    deactivatedMembership.id,
    createdMembership.id,
  );
  TestValidator.equals(
    "membership community id preserved after deactivation",
    deactivatedMembership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member user id preserved after deactivation",
    deactivatedMembership.memberuser.id,
    memberUser.id,
  );
  TestValidator.equals(
    "membership is_active is false after deactivation",
    deactivatedMembership.is_active,
    false,
  );

  // Optional: Reactivate membership to confirm toggling works
  const membershipUpdateBodyReactivate = {
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const reactivatedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: createdMembership.id,
        body: membershipUpdateBodyReactivate,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(reactivatedMembership);

  TestValidator.equals(
    "membership id preserved after reactivation",
    reactivatedMembership.id,
    createdMembership.id,
  );
  TestValidator.equals(
    "membership community id preserved after reactivation",
    reactivatedMembership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member user id preserved after reactivation",
    reactivatedMembership.memberuser.id,
    memberUser.id,
  );
  TestValidator.equals(
    "membership is_active is true after reactivation",
    reactivatedMembership.is_active,
    true,
  );
}
