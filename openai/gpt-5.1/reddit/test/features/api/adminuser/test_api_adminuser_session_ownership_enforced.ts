import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuserSession";

/**
 * Validate that an adminUser cannot inspect another adminUser's session via the
 * admin session inspection endpoint.
 *
 * Business context: Administrative actors in the community platform have
 * elevated permissions, but session records must remain isolated per admin
 * account. An adminUser should never be able to directly inspect another
 * admin's session details unless explicitly allowed by elevated policy (e.g., a
 * dedicated super-admin-only tool).
 *
 * This test focuses on the cross-account isolation behavior of `GET
 * /communityPlatform/adminUser/adminUsers/{username}/sessions/{sessionId}` by
 * exercising a scenario where one admin (Admin A) attempts to retrieve a
 * session that is scoped under another admin's username (Admin B) while
 * authenticated as Admin A.
 *
 * Steps:
 *
 * 1. Register and authenticate Admin A via POST /auth/adminUser/join, using random
 *    but valid join credentials. The SDK will store Admin A's JWT access token
 *    onto the shared `connection`.
 * 2. Using a cloned connection object, register and authenticate Admin B via the
 *    same join endpoint, capturing Admin B's `username` field from the
 *    authorized response. This clone keeps Admin B's token separate from the
 *    shared `connection`.
 * 3. Ensure that the original `connection` remains authenticated as Admin A (since
 *    only the clone was used for Admin B). No token switching is required
 *    because `join` mutated only the cloned connection when creating Admin B.
 * 4. While the shared `connection` still carries Admin A's Authorization header,
 *    attempt to call GET
 *    /communityPlatform/adminUser/adminUsers/{username}/sessions/{sessionId}
 *    with:
 *
 *    - `username` set to Admin B's username
 *    - `sessionId` set to a random UUID-like string. This combination represents
 *         Admin A attempting to inspect a session underneath Admin B's
 *         ownership scope.
 * 5. Wrap the cross-admin call in `TestValidator.error` and assert that it throws,
 *    demonstrating that Admin A cannot successfully retrieve a session for
 *    Admin B. We do not assert any particular HTTP status code or error body,
 *    only that an error occurs.
 *
 * Due to the lack of a sessions listing endpoint, the test does not assert the
 * presence of a real session row for Admin B. The primary goal is to ensure
 * that a cross-admin session inspection attempt does not succeed and that
 * session isolation is enforced at the endpoint level.
 */
export async function test_api_adminuser_session_ownership_enforced(
  connection: api.IConnection,
) {
  // 1. Register and authenticate Admin A on the primary connection.
  const adminAJoinBody = {
    username: `admin-a-${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminA = await api.functional.auth.adminUser.join(connection, {
    body: adminAJoinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminA);

  // 2. Clone the connection and register Admin B on the cloned connection
  //    so that Admin B's token does not overwrite Admin A's token on the
  //    main test connection.
  const clonedConnectionForAdminB: api.IConnection = {
    ...connection,
    headers: {
      ...(connection.headers ?? {}),
    },
  };

  const adminBJoinBody = {
    username: `admin-b-${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminB = await api.functional.auth.adminUser.join(
    clonedConnectionForAdminB,
    {
      body: adminBJoinBody,
    },
  );
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminB);

  // 3. At this point:
  //    - `connection` remains authenticated as Admin A
  //    - `clonedConnectionForAdminB` is authenticated as Admin B
  //    We will use the Admin B identity (username) but Admin A's token
  //    for the cross-admin session inspection attempt.

  // Sanity checks on authorized payloads (type already asserted, this is
  // just additional business-level validation that both usernames are
  // distinct to make the cross-admin attempt meaningful).
  TestValidator.notEquals(
    "admin A and admin B must have different usernames",
    adminA.username,
    adminB.username,
  );

  // 4. Attempt cross-admin session inspection using Admin A's token but
  //    targeting Admin B's username and a random UUID-like session id.
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "admin A cannot successfully inspect a session in admin B's scope",
    async () => {
      await api.functional.communityPlatform.adminUser.adminUsers.sessions.at(
        connection,
        {
          username: adminB.username,
          sessionId: randomSessionId,
        },
      );
    },
  );
}
