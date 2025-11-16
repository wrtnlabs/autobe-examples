import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform administrator can delete an existing guest user.
 *
 * Business context: Platform admins manage guest identities persisted in
 * `shopping_mall_guestuser`. This test ensures that an admin who has just
 * joined (and is therefore authenticated via the SDK) can create a guest user
 * and subsequently delete it using the platform-admin-only erase endpoint.
 *
 * Since the provided SDK does not expose a GET endpoint for guest users, the
 * test validates deletion by:
 *
 * - Creating a guest user via the platform admin context
 * - Deleting that exact guest user ID
 * - Asserting that both operations complete successfully without throwing errors,
 *   and that the ID passed to erase comes from the created record.
 *
 * Steps:
 *
 * 1. Join as a new platform admin using POST /auth/platformAdmin/join.
 *
 *    - Use typia.random<IShoppingMallPlatformAdminJoin.IRequest>() to produce a
 *         valid join request payload.
 *    - Confirm the response matches IShoppingMallPlatformAdmin.IAuthorized.
 *    - Rely on the SDK to inject the access token into connection.headers.
 * 2. Create a guest user via POST /shoppingMall/platformAdmin/guestUsers.
 *
 *    - Use typia.random<IShoppingMallGuestUser.ICreate>() as the request body.
 *    - Assert the response shape with typia.assert<IShoppingMallGuestUser>().
 * 3. Delete the newly created guest user via DELETE
 *    /shoppingMall/platformAdmin/guestUsers/{guestUserId}.
 *
 *    - Pass created.id as guestUserId to erase.
 *    - Await the call and ensure it does not throw.
 * 4. Sanity validations.
 *
 *    - Use TestValidator.predicate to assert that the ID used for deletion exactly
 *         matches the created guest user ID.
 *    - No re-fetch step is performed because a read API for guest users is not
 *         available in the provided SDK; we trust successful completion of
 *         erase as evidence of deletion.
 */
export async function test_api_platform_admin_delete_existing_guest_user(
  connection: api.IConnection,
) {
  // 1. Join as platform admin and establish authenticated session
  const adminJoinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a new guest user under platform admin context
  const guestCreateBody = typia.random<IShoppingMallGuestUser.ICreate>();
  const guestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert<IShoppingMallGuestUser>(guestUser);

  // 3. Delete the created guest user
  const targetGuestUserId = guestUser.id;
  TestValidator.predicate(
    "guest user id should be a non-empty string before deletion",
    targetGuestUserId.length > 0,
  );

  await api.functional.shoppingMall.platformAdmin.guestUsers.erase(connection, {
    guestUserId: targetGuestUserId,
  });

  // 4. Sanity check that the ID used in erase matches the created user ID
  TestValidator.equals(
    "deleted guest user id should match created guest user id",
    targetGuestUserId,
    guestUser.id,
  );
}
