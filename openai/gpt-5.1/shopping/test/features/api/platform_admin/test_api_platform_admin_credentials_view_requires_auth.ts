import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAuthCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredential";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that platform admin credential metadata endpoint strictly requires
 * authentication.
 *
 * Business goal: ensure that highly sensitive authentication credential
 * metadata for a platform administrator cannot be retrieved anonymously or with
 * an invalid token. The test demonstrates that the credentials view is only
 * available to properly authenticated platform admins, in line with the
 * endpoint documentation that authorizationActors = ["platformAdmin"].
 *
 * Test steps:
 *
 * 1. Provision a real platform admin account via /auth/platformAdmin/join using
 *    IShoppingMallPlatformAdminJoin.IRequest. This returns an
 *    IShoppingMallPlatformAdmin.IAuthorized object including the admin id and
 *    an access token automatically bound into the original connection’s
 *    headers.
 * 2. Capture the platformAdminId from the join response so we can target an
 *    existing administrator when calling the credentials endpoint.
 * 3. Build an unauthenticated connection by shallow-cloning the incoming
 *    connection and overriding headers with an empty object literal, so that no
 *    Authorization header is present at all.
 * 4. Using this unauthenticated connection, invoke
 *    api.functional.shoppingMall.platformAdmin.platformAdmins.credentials.at
 *    with the real platformAdminId. Wrap this call in TestValidator.httpError
 *    and assert that the result is an HTTP authorization error (401 or 403).
 *    Because the SDK is strongly typed to return
 *    IShoppingMallAuthCredential.ISummary on success, this negative-path test
 *    must be expressed purely as an error expectation and must not attempt to
 *    inspect any success payload.
 * 5. Optionally, construct a second cloned connection that carries an obviously
 *    invalid Authorization header (for example, "Bearer invalid-token") and
 *    repeat the credentials.at call in another TestValidator.httpError check,
 *    still expecting an authorization failure (401/403). This ensures that the
 *    endpoint is not only protected against anonymous access but also rejects
 *    malformed or unauthorized tokens.
 *
 * Implementation notes:
 *
 * - Request body for join must satisfy IShoppingMallPlatformAdminJoin.IRequest
 *   exactly; use typia.random<IShoppingMallPlatformAdminJoin.IRequest>() to
 *   generate valid test data instantly.
 * - Never touch connection.headers on the original connection instance beyond
 *   what the SDK itself does; when simulating unauthenticated or invalid-token
 *   calls, always work on cloned connection objects.
 * - Use TestValidator.httpError with status array [401, 403] to tolerate either
 *   unauthorized or forbidden variants of the auth failure.
 */
export async function test_api_platform_admin_credentials_view_requires_auth(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin so we have a real platformAdminId
  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: typia.random<IShoppingMallPlatformAdminJoin.IRequest>(),
    });
  typia.assert(authorizedAdmin);

  // 2. Capture the real platform admin id for later credential lookup
  const platformAdminId: string & tags.Format<"uuid"> = authorizedAdmin.id;

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  // 4. Expect credentials.at to fail without any Authorization header
  await TestValidator.httpError(
    "platform admin credentials endpoint requires auth for anonymous access",
    [401, 403],
    async () =>
      await api.functional.shoppingMall.platformAdmin.platformAdmins.credentials.at(
        unauthenticated,
        {
          platformAdminId,
        },
      ),
  );

  // 5. Build a connection with an obviously invalid Authorization token
  const invalidTokenConn: api.IConnection = {
    ...connection,
    headers: {
      ...(connection.headers ?? {}),
      Authorization: "Bearer invalid-platform-admin-token",
    },
  };

  // 6. Expect credentials.at to fail even when an invalid token is provided
  await TestValidator.httpError(
    "platform admin credentials endpoint rejects invalid tokens",
    [401, 403],
    async () =>
      await api.functional.shoppingMall.platformAdmin.platformAdmins.credentials.at(
        invalidTokenConn,
        {
          platformAdminId,
        },
      ),
  );
}
