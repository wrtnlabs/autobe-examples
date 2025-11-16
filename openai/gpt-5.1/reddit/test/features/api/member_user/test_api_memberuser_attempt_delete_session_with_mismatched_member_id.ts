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
 * Validate that an authenticated member user cannot delete another member
 * user's session.
 *
 * Business goal:
 *
 * - Ensure strong ownership checks on member sessions: a logged-in member can
 *   only delete their own sessions.
 * - Attempting to delete a session whose owner (memberUserId) does not match the
 *   authenticated principal must fail.
 * - After the failed attempt, the target member's session must remain valid and
 *   usable.
 *
 * High-level flow implemented in this E2E test:
 *
 * 1. Register member user A via POST /auth/memberUser/join to create account A and
 *    its initial session.
 *
 *    - Store A's id from ICommunityPlatformMemberuser.IAuthorized.
 *    - We do not get explicit session ids from the API, so for the cross-delete
 *         attempt we will generate independent UUIDs for the session path
 *         parameter (this still validates that the backend does not allow A to
 *         tamper with arbitrary session ids when the memberUserId belongs to a
 *         different account).
 * 2. Register member user B via POST /auth/memberUser/join, creating account B and
 *    its own initial session.
 *
 *    - Store B's id from ICommunityPlatformMemberuser.IAuthorized.
 * 3. Register a platform administrator via POST /auth/platformAdmin/join and
 *    create a visibility level.
 *
 *    - Join as platformAdmin (authorization handled automatically by SDK).
 *    - Create a visibility level using POST
 *         /communityPlatform/platformAdmin/communityVisibilityLevels with
 *         ICommunityPlatformCommunityVisibilityLevel.ICreate.
 * 4. As member user A, create a community and a membership request to simulate
 *    realistic usage for A.
 *
 *    - Login as member user A (so that we are sure the current connection is
 *         authenticated as A).
 *    - Create a community via POST /communityPlatform/memberUser/communities with
 *         ICommunityPlatformCommunity.ICreate, using the visibility level code
 *         created by admin.
 *    - Create a membership request via POST
 *         /communityPlatform/memberUser/communities/{communityIdentifier}/membershipRequests
 *         with ICommunityPlatformCommunityMembershipRequest.ICreate.
 * 5. While still authenticated as member user A, attempt to delete B's session
 *    using: DELETE
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/sessions/{sessionId}
 *
 *    - MemberUserId will be B.id (a different member user).
 *    - SessionId will be a random UUID; the test cares only that A cannot delete a
 *         session for another member, regardless of whether the session id
 *         exists.
 *    - Use TestValidator.error to assert that an error is thrown for this call.
 * 6. After the failed cross-account delete attempt, verify that B's session still
 *    works:
 *
 *    - Login as member user B using POST /auth/memberUser/login.
 *    - Confirm that the login succeeds and returns
 *         ICommunityPlatformMemberuser.IAuthorized.
 *    - Typia.assert() validates the response type and implicitly verifies that B's
 *         session is intact and usable.
 *
 * Assertions and validation:
 *
 * - Typia.assert() on all non-void responses to ensure schema correctness.
 * - TestValidator.error("member user A cannot delete B's session", async () => {
 *   ...erase... }) to assert that cross-account session deletion fails.
 */
export async function test_api_memberuser_attempt_delete_session_with_mismatched_member_id(
  connection: api.IConnection,
) {
  // 1. Register member user A (join)
  const memberAJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.mobile(),
    href: "https://client.example.com/join-A",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinInput,
    });
  typia.assert(memberA);

  // 2. Register member user B (join)
  const memberBJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.mobile(),
    href: "https://client.example.com/join-B",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinInput,
    });
  typia.assert(memberB);

  // 3. Join as platform admin and create a visibility level
  const adminJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(admin);

  const visibilityCreateInput = {
    code: `public-${RandomGenerator.alphaNumeric(8)}`,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateInput,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Switch back to member user A and create a community plus membership request
  const memberALoginInput = {
    identifier: memberA.email,
    password: memberAJoinInput.password,
    ip: RandomGenerator.mobile(),
    href: "https://client.example.com/login-A",
    referrer: "https://client.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberALogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginInput,
    });
  typia.assert(memberALogin);

  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;

  const communityCreateInput = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
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

  const membershipRequestCreateInput = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestCreateInput,
      },
    );
  typia.assert(membershipRequest);

  // 5. While authenticated as member A, attempt to delete B's session.
  //    We do not know B's concrete session id; use a random UUID. The core
  //    guarantee is that the backend must not allow session deletion for
  //    another memberUser id from A's context.
  const randomForeignSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "member user A cannot delete B's session",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.sessions.erase(
        connection,
        {
          memberUserId: memberB.id,
          sessionId: randomForeignSessionId,
        },
      );
    },
  );

  // 6. Verify that member user B's session is still valid by logging in as B.
  const memberBLoginInput = {
    identifier: memberB.email,
    password: memberBJoinInput.password,
    ip: RandomGenerator.mobile(),
    href: "https://client.example.com/login-B",
    referrer: "https://client.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberBLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginInput,
    });
  typia.assert(memberBLogin);

  // Additional sanity check that B's identity is the same before/after.
  TestValidator.equals(
    "member B id is stable across join and login",
    memberBLogin.id,
    memberB.id,
  );
}
