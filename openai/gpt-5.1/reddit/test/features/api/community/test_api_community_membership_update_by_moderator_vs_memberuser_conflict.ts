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
 * Validate last-write-wins membership status when sequential updates occur.
 *
 * Business goal: Ensure that when a membership is updated multiple times in
 * sequence (conceptually by different actors, member vs moderator), the final
 * membership state reflects the last update, while preserving the original
 * joined_at value and maintaining a consistent lifecycle for ended_at.
 *
 * NOTE: Only moderator update endpoint is available for write operations, so we
 * simulate the logical conflict sequence using that endpoint twice.
 */
export async function test_api_community_membership_update_by_moderator_vs_memberuser_conflict(
  connection: api.IConnection,
) {
  // 1. Register a member user (self-registration join).
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/signup",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register a community moderator.
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@mod.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://moderator.example.com/signup",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 3. Register a platform admin.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Capture identifiers we will need.
  const memberId = memberAuthorized.id;

  // 4. As platformAdmin, create a visibility level used by the community.
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);
  TestValidator.equals(
    "visibility code should match creation payload",
    visibility.code,
    visibilityCode,
  );

  // 5. As memberUser, create a community using the created visibility level.
  // SDK currently has platformAdmin token; re-auth as memberUser.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibility.code,
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
  TestValidator.equals(
    "community identifier should match creation payload",
    community.identifier,
    communityIdentifier,
  );

  // 6. As communityModerator, create an initial active membership for the member.
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  const membershipCreateBody = {
    memberuser_id: memberId,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const initialMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(initialMembership);

  TestValidator.equals(
    "initial membership should be active",
    initialMembership.is_active,
    true,
  );

  const originalJoinedAt = initialMembership.joined_at;

  // 7. First update: toggle is_active to false (conceptually memberUser deactivation).
  const firstUpdateBody = {
    is_active: false,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const afterFirstUpdate: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: initialMembership.id,
        body: firstUpdateBody,
      },
    );
  typia.assert(afterFirstUpdate);

  TestValidator.equals(
    "membership should be inactive after first update (deactivation)",
    afterFirstUpdate.is_active,
    false,
  );
  TestValidator.equals(
    "joined_at must remain stable after first update",
    afterFirstUpdate.joined_at,
    originalJoinedAt,
  );

  // 8. Second update: toggle is_active back to true (moderator reinstatement).
  const secondUpdateBody = {
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const afterSecondUpdate: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: initialMembership.id,
        body: secondUpdateBody,
      },
    );
  typia.assert(afterSecondUpdate);

  // Business assertions for last-write-wins and lifecycle consistency.
  TestValidator.equals(
    "final membership should be active after moderator reinstatement",
    afterSecondUpdate.is_active,
    true,
  );
  TestValidator.equals(
    "joined_at must remain identical across create and both updates",
    afterSecondUpdate.joined_at,
    originalJoinedAt,
  );

  if (
    afterSecondUpdate.ended_at !== null &&
    afterSecondUpdate.ended_at !== undefined
  ) {
    TestValidator.predicate(
      "when membership is active, any non-null ended_at should represent a past timestamp or at least not corrupt data",
      typeof afterSecondUpdate.ended_at === "string" &&
        afterSecondUpdate.ended_at.length > 0,
    );
  }

  // 9. Optional extra toggle cycle to ensure stability under repeated changes.
  const thirdUpdateBody = {
    is_active: false,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const afterThirdUpdate: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: initialMembership.id,
        body: thirdUpdateBody,
      },
    );
  typia.assert(afterThirdUpdate);

  TestValidator.equals(
    "membership should be inactive after third update",
    afterThirdUpdate.is_active,
    false,
  );
  TestValidator.equals(
    "joined_at remains stable after multiple updates",
    afterThirdUpdate.joined_at,
    originalJoinedAt,
  );
}
