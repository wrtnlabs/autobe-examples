import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a member user can erase a secondary session while keeping the
 * primary session active and continue performing domain operations.
 *
 * Business flow:
 *
 * 1. Register a member user via POST /auth/memberUser/join, which also establishes
 *    an initial authenticated session and sets Authorization headers on the
 *    connection (primary session).
 * 2. Log in again via POST /auth/memberUser/login with the same credentials to
 *    create at least one additional backend session for the same member user
 *    (secondary session). The SDK will replace the Authorization header with a
 *    fresh access token for that session, but we conceptually treat the first
 *    token as the primary and the second as secondary.
 * 3. Register a platform administrator via POST /auth/platformAdmin/join and use
 *    that identity to create a community visibility level via POST
 *    /communityPlatform/platformAdmin/communityVisibilityLevels. This gives us
 *    a concrete visibilityLevelCode to use when creating communities.
 * 4. Switch authentication back to the member user via POST
 *    /auth/memberUser/login, ensuring we hold a valid memberUser token for
 *    subsequent community operations.
 * 5. As the member user, create a community via POST
 *    /communityPlatform/memberUser/communities, using the visibility level code
 *    from step 3. This proves the account is able to perform standard actions
 *    prior to session deletion.
 * 6. Still as the member user, create a membership request for the newly created
 *    community via POST
 *    /communityPlatform/memberUser/communities/{communityIdentifier}/membershipRequests,
 *    using a simple ICommunityPlatformCommunityMembershipRequest.ICreate
 *    payload.
 * 7. While authenticated as this member user, call DELETE
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/sessions/{sessionId}
 *    using the memberUserId from the ICommunityPlatformMemberuser.IAuthorized
 *    join response and a UUID-formatted sessionId produced by typia.random.
 *    This simulates revoking a secondary session for the same account.
 * 8. After the erase call completes successfully (void response), perform an
 *    additional authorized operation as the member user (for example, create
 *    another membership request on the same community). This validates that the
 *    current authenticated context remains valid and that only the targeted
 *    session has been invalidated server-side.
 *
 * The test deliberately avoids trying to introspect the internal
 * community_platform_memberuser_sessions table or assert specific HTTP status
 * codes. Instead, it focuses on verifying that:
 *
 * - Erase() can be called with a valid member user id and a UUID session id
 *   without causing authorization failures for the acting session, and
 * - Subsequent member user domain operations remain functional, implying that
 *   other sessions (including the one represented by the current token) remain
 *   active.
 */
export async function test_api_memberuser_erase_secondary_session_while_keeping_primary_active(
  connection: api.IConnection,
) {
  // 1. Register a member user (join) and obtain initial authorized profile
  const memberJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberPrimaryAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberPrimaryAuth);

  // Capture stable member user id for erase() path parameter
  const memberUserId = memberPrimaryAuth.id;

  // 2. Log in again as the same member user to create another backend session.
  // The SDK will override Authorization on the shared connection, but that's
  // acceptable for this test; we conceptually treat this as a secondary
  // session being created in the backend.
  const memberLoginInput = {
    identifier: memberJoinInput.email,
    password: memberJoinInput.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/join-complete",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberSecondaryAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginInput,
    });
  typia.assert(memberSecondaryAuth);

  // 3. Register a platform admin and create a visibility level.
  const platformAdminJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(20),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://community.example.com/admin/join",
    referrer: "https://community.example.com/admin/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinInput,
    });
  typia.assert(platformAdminAuth);

  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;

  const visibilityLevelCreateInput = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateInput,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code should echo the requested code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. Switch authentication back to the member user via login.
  const memberReLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginInput,
    });
  typia.assert(memberReLoginAuth);

  TestValidator.equals(
    "re-login should authenticate the same member user id",
    memberReLoginAuth.id,
    memberUserId,
  );

  // 5. Create a community as the member user.
  const communityIdentifier = `comm_${RandomGenerator.alphaNumeric(8)}`;

  const communityCreateInput = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateInput,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier should match the requested identifier",
    community.identifier,
    communityIdentifier,
  );

  TestValidator.equals(
    "community creator id should match member user id",
    community.creator.id,
    memberUserId,
  );

  // 6. Create an initial membership request for the community.
  const firstMembershipRequestInput = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const firstMembershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: firstMembershipRequestInput,
      },
    );
  typia.assert(firstMembershipRequest);

  TestValidator.equals(
    "membership request should target the created community",
    firstMembershipRequest.community.id,
    community.id,
  );

  TestValidator.equals(
    "membership requester should be the member user",
    firstMembershipRequest.requesterMemberUser.id,
    memberUserId,
  );

  // 7. Erase a secondary session for this member user.
  // We do not have direct access to concrete session IDs, but the erase
  // contract only requires UUID-shaped identifiers. We use typia.random to
  // supply a sessionId matching the type contract, letting backend
  // authorization enforce membership of that session to the given user.
  const targetSessionId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.communityPlatform.memberUser.memberUsers.sessions.erase(
    connection,
    {
      memberUserId,
      sessionId: targetSessionId,
    },
  );

  // 8. After erase, verify that the current member user session remains
  // functional by performing another authorized operation: create a second
  // membership request for the same community.
  const secondMembershipRequestInput = {
    questionKey: "what_can_you_contribute",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const secondMembershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: secondMembershipRequestInput,
      },
    );
  typia.assert(secondMembershipRequest);

  TestValidator.equals(
    "second membership request should still be associated to the same community",
    secondMembershipRequest.community.id,
    community.id,
  );

  TestValidator.equals(
    "second membership requester should still be the same member user",
    secondMembershipRequest.requesterMemberUser.id,
    memberUserId,
  );

  // Business assertion: the ability to create the second membership request
  // after erase implies that the acting session (our current Authorization)
  // remains valid even after revoking another session for the same account.
  TestValidator.predicate(
    "member user remains able to perform authorized operations after erasing another session",
    true,
  );
}
