import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Ensure platform admin detail endpoint requires authentication.
 *
 * Business purpose:
 *
 * - Confirm that sensitive platform administrator profile data is not exposed to
 *   unauthenticated callers.
 * - Verify that the `authorizationActor = platformAdmin` requirement is
 *   effectively enforced by the detail endpoint
 *   `/shoppingMall/platformAdmin/platformAdmins/{platformAdminId}`.
 *
 * Scenario steps:
 *
 * 1. Register a new platform administrator via `POST /auth/platformAdmin/join`.
 *
 *    - Use a realistic `IShoppingMallPlatformAdminJoin.IRequest` payload with email,
 *         name, password, href, and referrer.
 *    - Capture the resulting `IShoppingMallPlatformAdmin.IAuthorized`, and assert it
 *         with `typia.assert`.
 * 2. Optionally create a guest user via `POST
 *    /shoppingMall/platformAdmin/guestUsers` just to satisfy the dependency,
 *    asserting the response with `typia.assert`.
 * 3. Build an unauthenticated connection by cloning the original `connection` but
 *    overriding `headers` with an empty object. This must be done once, without
 *    further reading or mutating `connection.headers` anywhere else.
 * 4. Invoke the protected admin detail endpoint `GET
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}` using
 *    `api.functional.shoppingMall.platformAdmin.platformAdmins.at` with:
 *
 *    - The unauthenticated connection
 *    - `platformAdminId` from the previously created admin.
 * 5. Use `TestValidator.httpError` to assert that calling the detail endpoint
 *    without authentication results in HTTP 401 Unauthorized, and that the
 *    request does not succeed.
 */
export async function test_api_platform_admin_detail_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to get a real platformAdminId
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing/platform-admin",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(authorizedAdmin);

  // 2. Optionally create a guest user record
  const guestBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const guestUser: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      { body: guestBody },
    );
  typia.assert<IShoppingMallGuestUser>(guestUser);

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4 & 5. Attempt to access platform admin detail without authentication
  await TestValidator.httpError(
    "platform admin detail requires authentication (401)",
    401,
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.at(
        unauthenticatedConnection,
        {
          platformAdminId: authorizedAdmin.id,
        },
      );
    },
  );
}
