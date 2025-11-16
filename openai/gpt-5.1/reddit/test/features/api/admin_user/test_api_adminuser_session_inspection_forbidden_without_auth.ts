import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuserSession";

/**
 * Ensure that admin user session inspection is forbidden without
 * authentication.
 *
 * Business purpose:
 *
 * - The session inspection endpoint exposes sensitive administrative session
 *   metadata and must only be callable by authenticated adminUser actors.
 * - Anonymous callers (no Authorization header) must not be able to inspect any
 *   admin sessions, regardless of whether the targeted session exists.
 *
 * Test steps:
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join to satisfy the
 *    dependency that at least one admin account exists in the system.
 * 2. From the join response, capture the admin username (for the path param).
 * 3. Construct a clearly bogus sessionId (UUID-like) for the path param. We do not
 *    need a real sessionId because this test focuses only on missing auth.
 * 4. Derive an unauthenticated connection from the provided connection by cloning
 *    it with an empty headers object so that no Authorization header is
 *    present.
 * 5. Call GET
 *    /communityPlatform/adminUser/adminUsers/{username}/sessions/{sessionId}
 *    using the unauthenticated connection.
 * 6. Assert that an error is thrown, indicating that the endpoint rejects
 *    unauthenticated access. We do not assert specific HTTP status codes, only
 *    that some error occurs.
 */
export async function test_api_adminuser_session_inspection_forbidden_without_auth(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser (dependency setup)
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Capture the username for path parameter usage
  const username: string = authorized.username;

  // 3. Construct a bogus sessionId (UUID-like) for the path parameter
  const sessionId: string = typia.random<string & tags.Format<"uuid">>();

  // 4. Derive an unauthenticated connection (no headers)
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5 & 6. Attempt to inspect the session without auth and expect an error
  await TestValidator.error(
    "session inspection must fail without admin auth",
    async () => {
      await api.functional.communityPlatform.adminUser.adminUsers.sessions.at(
        anonymousConnection,
        {
          username,
          sessionId,
        },
      );
    },
  );
}
