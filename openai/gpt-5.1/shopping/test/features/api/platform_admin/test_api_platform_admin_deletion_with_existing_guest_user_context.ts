import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate deletion of a platform administrator when a guest user identity
 * exists.
 *
 * This test exercises the minimal admin lifecycle supported by the available
 * SDK functions:
 *
 * - Platform admin registration + authentication via POST
 *   /auth/platformAdmin/join
 * - Guest user creation under platformAdmin context via POST
 *   /shoppingMall/platformAdmin/guestUsers
 * - Permanent deletion of that admin via DELETE
 *   /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}
 *
 * Scenario steps:
 *
 * 1. Register a new platform administrator using join(), providing realistic
 *    email, name, password, and session context (href, referrer, ip). The SDK
 *    automatically injects the issued access token into the connection
 *    headers.
 * 2. With the authenticated platformAdmin session, create a guest user via
 *    guestUsers.create() using a stable temporary_identifier and optional
 *    user_agent.
 * 3. Validate both responses with typia.assert to guarantee type correctness, and
 *    use TestValidator to perform a simple business check that the guest user's
 *    temporary_identifier matches what was requested.
 * 4. Call platformAdmins.erase() with the id returned from join(), ensuring that
 *    the operation completes without throwing, which implies successful
 *    deletion of the platformAdmin row per its contract.
 * 5. Create a fresh, unauthenticated connection by cloning the existing connection
 *    and overriding headers with an empty object, then assert that a
 *    platformAdmin-only operation (guestUsers.create) fails with an error when
 *    invoked through this anonymous connection to demonstrate that admin
 *    capabilities depend on valid authentication.
 */
export async function test_api_platform_admin_deletion_with_existing_guest_user_context(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join) with realistic request data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(1),
    password: "Str0ngP@ssw0rd!", // simple strong password literal
    ip: null, // explicitly exercise nullable ip field
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a guest user using the authenticated platform admin session
  const guestCreateBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const guest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert(guest);

  // Ensure the created guest user reflects the requested identifier
  TestValidator.equals(
    "guest temporary_identifier should match request",
    guest.temporary_identifier,
    guestCreateBody.temporary_identifier,
  );

  // 3. Erase the platform administrator using its id from the join response
  await api.functional.shoppingMall.platformAdmin.platformAdmins.erase(
    connection,
    {
      platformAdminId: authorizedAdmin.id,
    },
  );

  // 4. Negative authorization check: using an unauthenticated connection
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "guest user creation must fail without platformAdmin authentication",
    async () => {
      await api.functional.shoppingMall.platformAdmin.guestUsers.create(
        anonymousConnection,
        {
          body: guestCreateBody,
        },
      );
    },
  );
}
