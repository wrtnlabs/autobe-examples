import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that DELETE of a guest user session is restricted to authenticated
 * platform administrators and fails for unauthenticated callers.
 *
 * Business intent:
 *
 * - The endpoint DELETE
 *   /communityPlatform/platformAdmin/guestUsers/{guestUserId}/sessions/{sessionId}
 *   is explicitly an administrative tool for platformAdmin actors, not a
 *   self-service logout API.
 * - Only callers authenticated as platformAdmin should be able to delete a guest
 *   session row; any unauthenticated or non-admin caller should fail.
 *
 * Test flow:
 *
 * 1. Prepare a dedicated unauthenticated connection that has no Authorization
 *    header, to simulate a completely anonymous caller.
 * 2. Generate placeholder identifiers for guestUserId and sessionId using random
 *    strings. The goal of this test is authorization behavior, not existence of
 *    the underlying DB rows, so the identifiers themselves are opaque values.
 * 3. Call DELETE
 *    api.functional.communityPlatform.platformAdmin.guestUsers.sessions.erase
 *    with the unauthenticated connection and verify that it fails with an HTTP
 *    error using TestValidator.httpError or TestValidator.error (without
 *    asserting a specific status code).
 * 4. Using the original `connection`, register a new platform administrator by
 *    calling api.functional.auth.platformAdmin.join with a fully-populated
 *    ICommunityPlatformPlatformadmin.IJoin body. This call will automatically
 *    attach the issued access token into connection.headers.Authorization.
 * 5. Assert the ICommunityPlatformPlatformadmin.IAuthorized response using
 *    typia.assert to guarantee type correctness and ensure token presence.
 * 6. While authenticated as platformAdmin, create a platform-wide setting by
 *    calling
 *    api.functional.communityPlatform.platformAdmin.platformSettings.create
 *    with an ICommunityPlatformPlatformSetting.ICreate body. This establishes
 *    required global configuration context and also validates that the admin
 *    token works for other protected admin endpoints.
 * 7. Assert the returned ICommunityPlatformPlatformSetting instance using
 *    typia.assert.
 * 8. Call DELETE guestUsers.sessions.erase again, this time with the authenticated
 *    `connection` and the same guestUserId/sessionId values, and assert that
 *    the call completes successfully (no error thrown). Because the erase()
 *    function has a void return type, there is nothing to assert on the
 *    response body itself; success is determined by the absence of thrown
 *    errors.
 *
 * Notes and constraints:
 *
 * - We must never manipulate connection.headers directly except when creating a
 *   fresh unauthenticated connection object via spread and an explicit headers:
 *   {} override; this ensures we do not mutate the original connection state
 *   outside of what the SDK itself performs.
 * - We do not and must not assert on specific HTTP status codes. The test focuses
 *   purely on whether an error is thrown or not for each scenario.
 * - Since the scenario materials do not include any API for creating actual guest
 *   user sessions, this test intentionally treats guestUserId and sessionId as
 *   opaque identifiers and validates only the authorization gate behavior
 *   around the erase() endpoint.
 */
export async function test_api_guest_user_session_delete_respects_authorization(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection that does not inherit any
  //    Authorization header.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Generate placeholder identifiers for guestUserId and sessionId.
  const guestUserId: string = RandomGenerator.alphaNumeric(16);
  const sessionId: string = RandomGenerator.alphaNumeric(16);

  // 3. Attempt deletion without authentication and expect an error.
  await TestValidator.error("unauthenticated erase must fail", async () => {
    await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.erase(
      unauthenticatedConnection,
      {
        guestUserId,
        sessionId,
      },
    );
  });

  // 4. Join as platform administrator using the original authenticated
  //    capable connection. This will internally update
  //    connection.headers.Authorization with the admin access token.
  const adminJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 5. Create a platform-wide setting to ensure configuration and verify the
  //    admin token can successfully access other admin endpoints.
  const settingCreateBody = {
    key: `test.setting.${RandomGenerator.alphaNumeric(8)}`,
    value: "true",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const createdSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: settingCreateBody,
      },
    );
  typia.assert(createdSetting);

  // 6. Attempt deletion again with the authenticated platformAdmin
  //    connection; this time it must succeed without throwing.
  await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.erase(
    connection,
    {
      guestUserId,
      sessionId,
    },
  );
}
