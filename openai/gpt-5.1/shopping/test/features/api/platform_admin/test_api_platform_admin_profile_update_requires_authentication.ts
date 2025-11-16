import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Ensure platform admin profile update requires authentication and does not
 * accept unauthenticated requests.
 *
 * Business goals:
 *
 * - Only authenticated platformAdmin actors may modify platform admin profile
 *   data.
 * - Unauthorized update attempts must be rejected and must not change persisted
 *   data.
 *
 * Scenario outline:
 *
 * 1. Register an initial platform admin (Admin A) using POST
 *    /auth/platformAdmin/join.
 *
 *    - This both creates the platform admin row and authenticates Admin A.
 *    - Capture the created admin id from IShoppingMallPlatformAdmin.IAuthorized.
 * 2. Optionally create a guest user via POST
 *    /shoppingMall/platformAdmin/guestUsers.
 *
 *    - This step exercises the dependency but does not affect authorization.
 * 3. Read Admin A’s profile via GET
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId} using the
 *    authenticated connection and store the full IShoppingMallPlatformAdmin
 *    snapshot.
 * 4. Prepare a minimal IShoppingMallPlatformAdmin.IUpdate payload that changes
 *    profile fields such as `email` and `displayName`.
 * 5. Create an unauthenticated connection by cloning the existing connection but
 *    resetting headers to an empty object. Per global test rules, do not
 *    manipulate connection.headers on the original connection; instead, derive
 *    a new connection object `const unauthConn: api.IConnection = {
 *    ...connection, headers: {} };` and never mutate its headers afterwards.
 * 6. Invoke api.functional.shoppingMall.platformAdmin.platformAdmins.update using
 *    the unauthenticated connection, targeting Admin A’s id and passing the
 *    prepared update body.
 *
 *    - Wrap the call in TestValidator.error to assert that an error is thrown for
 *         the unauthorized request, without asserting any specific HTTP status
 *         code.
 * 7. To confirm there was no state change, create a fresh platform admin (Admin B)
 *    via a second POST /auth/platformAdmin/join call, which authenticates Admin
 *    B.
 *
 *    - Using Admin B’s authenticated connection, call GET
 *         /shoppingMall/platformAdmin/platformAdmins/{platformAdminId} for
 *         Admin A’s id.
 *    - Compare the retrieved admin profile with the original snapshot from step 3
 *         using TestValidator.equals, ensuring fields like `email`,
 *         `displayName`, `status`, and lifecycle timestamps have not changed as
 *         a result of the unauthorized update attempt.
 * 8. The test succeeds if:
 *
 *    - The unauthorized update call throws an error, and
 *    - Admin A’s profile remains identical before and after the unauthorized
 *         attempt.
 */
export async function test_api_platform_admin_profile_update_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register initial platform admin (Admin A)
  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminA = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBodyA,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminA);

  // 2. Optionally create a guest user
  const guestBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const guestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      { body: guestBody },
    );
  typia.assert<IShoppingMallGuestUser>(guestUser);

  // 3. Snapshot Admin A profile using authenticated connection
  const originalProfile: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.at(
      connection,
      { platformAdminId: adminA.id },
    );
  typia.assert<IShoppingMallPlatformAdmin>(originalProfile);

  // 4. Prepare update payload attempting to change email and displayName
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    displayName: RandomGenerator.name(),
  } satisfies IShoppingMallPlatformAdmin.IUpdate;

  // 5. Create unauthenticated connection without Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 6. Attempt unauthorized update and expect an error (auth failure)
  await TestValidator.error(
    "unauthenticated update on platform admin must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.update(
        unauthConn,
        {
          platformAdminId: adminA.id,
          body: updateBody,
        },
      );
    },
  );

  // 7. Create a fresh platform admin (Admin B) for independent verification
  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminB = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBodyB,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminB);

  // 8. Reload Admin A’s profile after unauthorized attempt using authenticated connection
  const reloadedProfile: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.at(
      connection,
      { platformAdminId: adminA.id },
    );
  typia.assert<IShoppingMallPlatformAdmin>(reloadedProfile);

  // 9. Ensure that profile has not changed due to unauthorized update attempt
  TestValidator.equals(
    "platform admin profile must remain unchanged after unauthorized update attempt",
    reloadedProfile,
    originalProfile,
  );
}
