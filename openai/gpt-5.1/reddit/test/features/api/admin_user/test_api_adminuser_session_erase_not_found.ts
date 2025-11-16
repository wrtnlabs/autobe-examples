import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Validate behavior when an authenticated adminUser attempts to erase a
 * non-existent admin session.
 *
 * ## Business context
 *
 * The community platform exposes an administrative actor type, `adminUser`,
 * whose accounts live in `community_platform_adminusers`. Sessions for these
 * admins are tracked in `community_platform_adminuser_sessions`. The `erase`
 * endpoint allows an authorized admin to target a particular admin username and
 * session id pair and delete that session row from the session table. According
 * to the endpoint description, if the specified admin, session, or association
 * between them does not exist, the service should respond with an error
 * (typically a 404 Not Found) rather than silently succeeding.
 *
 * This E2E focuses on the not-found deletion scenario: an adminUser who is
 * properly authenticated tries to erase a session id that does not exist for
 * that username.
 *
 * ## End-to-end workflow
 *
 * 1. Join as an adminUser
 *
 *    - Call POST /auth/adminUser/join via `api.functional.auth.adminUser.join` using
 *         a random username, email, and password
 *         (`ICommunityPlatformAdminUserJoin.IRequest`).
 *    - The join call returns `ICommunityPlatformAdminuser.IAuthorized`, which
 *         contains the admin's username and an `IAuthorizationToken`.
 *    - The SDK implementation automatically sets `connection.headers.Authorization`
 *         to the access token, so subsequent calls use the adminUser context
 *         without manual header manipulation.
 * 2. Attempt to erase a non-existent session
 *
 *    - Generate a random `sessionId` string that is extremely unlikely to correspond
 *         to a real session row (for example, a 32-character alphanumeric
 *         token).
 *    - Call DELETE
 *         `/communityPlatform/adminUser/adminUsers/{username}/sessions/{sessionId}`
 *         via
 *         `api.functional.communityPlatform.adminUser.adminUsers.sessions.erase`
 *         using:
 *
 *         - `username`: the value from the authorized adminUser response.
 *         - `sessionId`: the random token from the previous step.
 * 3. Validate error behavior for not-found
 *
 *    - Wrap the erase call in `await TestValidator.error(...)` to assert that the
 *         operation fails instead of returning successfully.
 *    - In line with the global test rules, the test does not verify the specific
 *         HTTP status code (such as 404) or error message body. It only checks
 *         that an error occurs when attempting to erase a non-existent
 *         session.
 *
 * ## Constraints and design choices
 *
 * - Only the provided SDK functions are used:
 *
 *   - `api.functional.auth.adminUser.join` for creating and authenticating the
 *       adminUser.
 *   - `api.functional.communityPlatform.adminUser.adminUsers.sessions.erase` for
 *       issuing the delete request.
 * - DTO usage strictly follows the given definitions:
 *
 *   - Join body uses `ICommunityPlatformAdminUserJoin.IRequest`.
 *   - Join response is asserted as `ICommunityPlatformAdminuser.IAuthorized`.
 * - The test never touches `connection.headers` directly; token handling is
 *   delegated to the SDK implementation.
 * - The scenario intentionally does not attempt to create a real session entry
 *   first (e.g., via admin login or refresh endpoints) because they are not
 *   part of the provided materials. Instead, it relies on the documented
 *   behavior that an invalid session id should trigger an error.
 */
export async function test_api_adminuser_session_erase_not_found(
  connection: api.IConnection,
) {
  // 1. Join as an adminUser to obtain an authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(authorized);

  // 2. Generate a non-existent session id for this adminUser
  const nonExistentSessionId: string = RandomGenerator.alphaNumeric(32);

  // 3. Attempt to erase the non-existent session and expect an error
  await TestValidator.error(
    "erase non-existent admin session should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.adminUsers.sessions.erase(
        connection,
        {
          username: authorized.username,
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
}
