import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformadminSession";

/**
 * Validate that a platform administrator cannot retrieve detailed session
 * information for a different platform administrator.
 *
 * ## Business context
 *
 * Platform administrators have access to sensitive operational tooling,
 * including the ability to inspect authentication sessions via
 * /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/sessions/{sessionId}.
 * However, for security and privacy reasons, one administrator must never be
 * able to introspect another administrator's session details. The backend is
 * expected to enforce this via strict authorization checks and by returning an
 * access-denied or not-found style error when a cross-admin access attempt is
 * made.
 *
 * Due to the current SDK surface, there is no public API to list or obtain a
 * concrete sessionId for a given administrator; join() implicitly creates a
 * session but does not expose its id. Therefore, this test focuses on the
 * observable security contract: that an authenticated platform admin (Admin B)
 * cannot successfully call the session detail endpoint scoped to another admin
 * (Admin A) and receive an IShoppingMallPlatformadminSession object. Whether
 * the sessionId in the request is valid or not, the result must be an error
 * instead of a successful detail payload.
 *
 * ## Step-by-step process
 *
 * 1. Register Admin A via POST /auth/platformAdmin/join, capturing the resulting
 *    IShoppingMallPlatformAdmin.IAuthorized payload and Admin A's id.
 * 2. Register Admin B via POST /auth/platformAdmin/join, capturing its
 *    IShoppingMallPlatformAdmin.IAuthorized payload. The connection will now
 *    carry Admin B's token.
 * 3. Generate a random UUID to act as a target sessionId for the cross-admin
 *    detail request. This simulates attempting to inspect some session under
 *    Admin A's scope.
 * 4. While authenticated as Admin B, invoke GET
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/sessions/{sessionId}
 *    with platformAdminId set to Admin A's id and the random sessionId.
 * 5. Assert that this call fails using TestValidator.error, proving that platform
 *    admins cannot obtain session details for other admins.
 * 6. Additionally, assert that Admin A and Admin B are distinct accounts to ensure
 *    the test truly exercises cross-admin access rather than self-access.
 */
export async function test_api_platformadmin_session_detail_cross_admin_access_denied(
  connection: api.IConnection,
) {
  // 1. Create Admin A via platformAdmin.join
  const adminABody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "P@ssw0rd123",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminA: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminABody,
    });
  typia.assert(adminA);

  const adminAId = adminA.id;

  // 2. Create Admin B via platformAdmin.join (connection now authenticated as Admin B)
  const adminBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "P@ssw0rd123",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminB: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminBBody,
    });
  typia.assert(adminB);

  // Sanity check: Admin A and Admin B must be distinct accounts
  TestValidator.notEquals(
    "platform admin A and B must be different",
    adminA.id,
    adminB.id,
  );

  // 3. Generate a random sessionId to use in the cross-admin access attempt
  const targetSessionId = typia.random<string & tags.Format<"uuid">>();

  // 4. While authenticated as Admin B, attempt to retrieve a session detail
  //    scoped to Admin A. This must fail with an authorization/not-found style
  //    error and must not return an IShoppingMallPlatformadminSession payload.
  await TestValidator.error(
    "platform admin cannot view another admin's session detail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.sessions.at(
        connection,
        {
          platformAdminId: adminAId,
          sessionId: targetSessionId,
        },
      );
    },
  );
}
