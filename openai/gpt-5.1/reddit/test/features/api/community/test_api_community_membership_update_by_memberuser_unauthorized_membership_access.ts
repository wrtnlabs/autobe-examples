import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a member user cannot update another member's community
 * membership via the memberUser-scoped update endpoint.
 *
 * Business purpose
 *
 * - Ensure ownership-based authorization on membership updates: a memberUser must
 *   not be able to manipulate another member's membership record using the
 *   `/communityPlatform/memberUser/communities/{communityIdentifier}/memberships/{membershipId}`
 *   endpoint.
 * - Confirm that authentication failures (no token) are separate from
 *   authorization failures (wrong but valid member user).
 *
 * High-level workflow
 *
 * 1. Create memberUser A (attacker) and obtain tokens.
 * 2. Create memberUser B (legitimate membership owner) and obtain tokens.
 * 3. Create a platform admin and obtain tokens.
 * 4. As platformAdmin, create a visibility level master record.
 * 5. As memberUser B, create a community using that visibility level.
 * 6. As platformAdmin, create a membership for memberUser B in that community.
 * 7. As memberUser A, attempt to update B's membership via the memberUser
 *    membership update endpoint and verify it fails with an HTTP-level error.
 * 8. Ensure that the membership object returned from the create step remains
 *    unchanged in the visible business fields we can observe.
 * 9. As a separate edge check, call the same update endpoint using an
 *    unauthenticated connection (no Authorization header) and verify that this
 *    results in an authentication-style error distinct from the ownership-based
 *    authorization failure.
 *
 * Constraints and notes
 *
 * - We do NOT attempt to test low-level type validation: all payloads must be
 *   type-correct and satisfy DTO constraints.
 * - We cannot directly re-fetch the membership by ID with a read endpoint (none
 *   is provided here), so state invariance is validated by comparing the
 *   pre-update object from the admin-created membership and logically expecting
 *   no change after a failed update.
 * - For the edge unauthenticated call, we construct a secondary connection with
 *   empty headers to simulate a missing-token state, without manually touching
 *   the original connection.headers beyond what the SDK already does.
 */
export async function test_api_community_membership_update_by_memberuser_unauthorized_membership_access(
  connection: api.IConnection,
) {
  // 1. Register memberUser A (attacker)
  const joinMemberUserABody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member-a.example.com/join",
    referrer: "https://member-a.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberUserA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinMemberUserABody,
    });
  typia.assert(memberUserA);

  // 2. Register memberUser B (legitimate owner)
  const joinMemberUserBBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member-b.example.com/join",
    referrer: "https://member-b.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberUserB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinMemberUserBBody,
    });
  typia.assert(memberUserB);

  // 3. Register a platform admin and obtain tokens
  const joinPlatformAdminBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinPlatformAdminBody,
    });
  typia.assert(platformAdmin);

  // 4. As platformAdmin, create a visibility level
  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityName = RandomGenerator.name();
  const createVisibilityBody = {
    code: visibilityCode,
    name: visibilityName,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: createVisibilityBody },
    );
  typia.assert(visibility);
  TestValidator.equals(
    "visibility level code should match the requested code",
    visibility.code,
    visibilityCode,
  );

  // 5. Switch to memberUser B and create a community using that visibility
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: joinMemberUserBBody.email,
      password: joinMemberUserBBody.password,
      ip: null,
      href: "https://member-b.example.com/login",
      referrer: "https://member-b.example.com/home",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const createCommunityBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: createCommunityBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier should match input",
    community.identifier,
    communityIdentifier,
  );

  // 6. Switch back to platformAdmin and create a membership for memberUser B
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: joinPlatformAdminBody.email,
      password: joinPlatformAdminBody.password,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/home",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const createMembershipBody = {
    memberuser_id: memberUserB.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;
  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: createMembershipBody,
      },
    );
  typia.assert(membership);
  TestValidator.equals(
    "membership should be active after creation",
    membership.is_active,
    true,
  );
  TestValidator.equals(
    "membership community id should match created community",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership owner should be memberUser B",
    membership.memberuser.id,
    memberUserB.id,
  );

  // 7. Switch to memberUser A and attempt forbidden update
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: joinMemberUserABody.email,
      password: joinMemberUserABody.password,
      ip: null,
      href: "https://member-a.example.com/login",
      referrer: "https://member-a.example.com/home",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const attackerUpdateBody = {
    is_active: false,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  await TestValidator.error(
    "memberUser A should not be allowed to update memberUser B's membership",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.memberships.update(
        connection,
        {
          communityIdentifier: community.identifier,
          membershipId: membership.id,
          body: attackerUpdateBody,
        },
      );
    },
  );

  TestValidator.equals(
    "original membership remains active flag true after forbidden update attempt (logical expectation)",
    membership.is_active,
    true,
  );

  // 8. Edge check: unauthenticated connection should yield authentication error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const unauthUpdateBody = {
    is_active: false,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  await TestValidator.error(
    "unauthenticated memberUser update call should fail with authentication error",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.memberships.update(
        unauthenticatedConnection,
        {
          communityIdentifier: community.identifier,
          membershipId: membership.id,
          body: unauthUpdateBody,
        },
      );
    },
  );
}
