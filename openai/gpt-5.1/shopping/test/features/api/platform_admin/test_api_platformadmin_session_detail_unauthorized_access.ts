import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformadminSession";

/**
 * Validate that platform admin session detail endpoint enforces authentication.
 *
 * Business purpose: The platform administrator session detail endpoint exposes
 * sensitive information about authentication sessions (IP, device, location,
 * lifecycle flags, etc.). It must therefore only be accessible to authenticated
 * platform admin actors. An unauthenticated caller, even with knowledge of
 * valid platformAdminId and sessionId values, must not be able to retrieve
 * session details.
 *
 * Test steps:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join.
 *
 *    - Use realistic random data for email, name, password, href, and referrer.
 *    - Capture the returned IShoppingMallPlatformAdmin.IAuthorized object to obtain
 *         the platform admin id.
 * 2. Using the authenticated connection, attempt to read a session detail once to
 *    confirm the endpoint works under normal conditions.
 *
 *    - Call GET /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/sessions/{sessionId}
 *         with platformAdminId = admin.id and sessionId = any valid UUID
 *         generated for the test (best-effort; the backend will resolve whether
 *         such session exists).
 *    - This step is optional from an authorization perspective, but we can still
 *         call the endpoint and assert the type of the response if it
 *         succeeds.
 * 3. Construct a new unauthenticated connection object derived from the existing
 *    one but with an empty headers object so that no Authorization header is
 *    sent.
 * 4. Call the same GET
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/sessions/{sessionId}
 *    endpoint using the unauthenticated connection.
 *
 *    - Use the same platformAdminId and sessionId as in step 2.
 * 5. Use TestValidator.httpError with expected status codes [401, 403] to assert
 *    that unauthenticated access is rejected.
 *
 * Notes and constraints:
 *
 * - We must not touch connection.headers directly except when creating a new
 *   unauthenticated connection object with headers: {}. No further mutation of
 *   headers is allowed.
 * - We do not intentionally send wrong-typed payloads or omit required fields;
 *   the negative scenario is purely based on missing authentication.
 * - Session existence is not strictly required to verify authorization behavior,
 *   but when we do get a 2xx response in the authenticated path we will
 *   validate it via typia.assert(IShoppingMallPlatformadminSession).
 */
export async function test_api_platformadmin_session_detail_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (this also sets Authorization header
  //    on the provided connection via SDK side-effect).
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Best-effort attempt to call session detail with authenticated connection.
  //    We do not rely on this succeeding for the unauthorized test, but when it
  //    does succeed we validate the response type.
  const platformAdminId = admin.id;
  const someSessionId = typia.random<string & tags.Format<"uuid">>();

  try {
    const session: IShoppingMallPlatformadminSession =
      await api.functional.shoppingMall.platformAdmin.platformAdmins.sessions.at(
        connection,
        {
          platformAdminId,
          sessionId: someSessionId,
        },
      );
    typia.assert(session);
  } catch {
    // Ignore failures here; existence of a concrete session is not required
    // for the unauthorized access verification.
  }

  // 3. Build an unauthenticated connection by cloning host/options but with
  //    empty headers so that no Authorization is present.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Verify that the same session detail call fails for the unauthenticated
  //    connection with 401 or 403.
  await TestValidator.httpError(
    "unauthenticated caller cannot read platform admin session detail",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.sessions.at(
        unauthenticatedConnection,
        {
          platformAdminId,
          sessionId: someSessionId,
        },
      );
    },
  );
}
