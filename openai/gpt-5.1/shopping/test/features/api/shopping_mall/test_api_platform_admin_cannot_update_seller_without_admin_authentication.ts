import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Verify that platform-admin seller update operations cannot be executed
 * without an authenticated platform administrator context.
 *
 * Business intent
 *
 * - The endpoint PUT /shoppingMall/platformAdmin/sellers/{sellerId} is reserved
 *   exclusively for platformAdmin actors.
 * - Anonymous callers (no Authorization header) must not be able to update any
 *   seller profile, even if they provide a syntactically valid sellerId and
 *   IShoppingMallSeller.IUpdate payload.
 * - We validate that an unauthenticated call results in a failure and never
 *   reaches seller update business logic.
 *
 * Scenario steps
 *
 * 1. Bootstrap a platform admin account with POST /auth/platformAdmin/join to
 *    reflect the dependency that such actors exist in the system. This uses a
 *    realistic IShoppingMallPlatformAdminJoin.IRequest body and asserts the
 *    returned IShoppingMallPlatformAdmin.IAuthorized structure.
 * 2. Optionally create a guest user via POST
 *    /shoppingMall/platformAdmin/guestUsers to exercise the surrounding admin
 *    namespace lifecycle; this result is not directly used in the authorization
 *    negative test but keeps the environment realistic.
 * 3. Derive an unauthenticated connection instance from the provided `connection`
 *    by cloning it and setting a fresh, empty `headers` object. This new
 *    `unauthConn` is used only for the negative test call and does not mutate
 *    the original connection's headers (which may contain an admin token from
 *    step 1, managed internally by the SDK).
 * 4. Prepare a syntactically valid sellerId using a random UUID and construct a
 *    minimal IShoppingMallSeller.IUpdate body that attempts to change the
 *    `store_name` field.
 * 5. Invoke api.functional.shoppingMall.platformAdmin.sellers.update using the
 *    unauthenticated connection and wrap the call in TestValidator.error with
 *    an async callback to assert that some error is thrown. We intentionally do
 *    not inspect HTTP status codes; it is sufficient that the operation fails
 *    for unauthenticated callers.
 *
 * Note
 *
 * - Because no seller creation or read endpoints are available in this isolated
 *   test context, we cannot assert that a concrete seller record remains
 *   unchanged. Instead, we focus the test strictly on authorization behavior:
 *   the update attempt must not succeed when executed without a platformAdmin
 *   authentication context.
 */
export async function test_api_platform_admin_cannot_update_seller_without_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Bootstrap a platform admin account (dependency: POST /auth/platformAdmin/join)
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Optionally create a guest user (dependency: POST /shoppingMall/platformAdmin/guestUsers)
  const guestCreateBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(24),
    user_agent: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const guestUser: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert(guestUser);

  // 3. Prepare an unauthenticated connection by cloning and clearing headers
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Prepare a fake sellerId and minimal update payload
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    store_name: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.IUpdate;

  // 5. Attempt seller update with unauthenticated connection and expect failure
  await TestValidator.error(
    "unauthenticated caller cannot update seller via platformAdmin endpoint",
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellers.update(
        unauthConn,
        {
          sellerId,
          body: updateBody,
        },
      );
    },
  );
}
