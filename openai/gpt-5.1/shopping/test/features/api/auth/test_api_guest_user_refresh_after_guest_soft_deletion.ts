import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUserJoin";
import type { IShoppingMallGuestUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUserRefresh";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a guestUser refresh token becomes unusable after the underlying
 * guest identity has been soft deleted by a platform admin.
 *
 * Business workflow validated by this test:
 *
 * 1. Register a guestUser and obtain its id and refresh token.
 * 2. Prove that the refresh token works while the guest is still active.
 * 3. Establish a platformAdmin session.
 * 4. Soft delete the guestUser via the platform-admin-only update endpoint,
 *    setting `deleted_at` on the guest record.
 * 5. Attempt to refresh again with the original refresh token and verify that the
 *    operation now fails, meaning tokens associated with soft-deleted guests
 *    are no longer accepted.
 */
export async function test_api_guest_user_refresh_after_guest_soft_deletion(
  connection: api.IConnection,
) {
  // 1. Register a new guestUser and capture its id and refresh token
  const guestJoin = typia.random<IShoppingMallGuestUserJoin.IRequest>();
  const guestAuthorized: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: guestJoin,
    });
  typia.assert(guestAuthorized);

  const guestId = guestAuthorized.id;
  const refreshToken = guestAuthorized.token.refresh;

  // 2. Prove the refresh token works before soft deletion
  const preDeleteRefreshBody = {
    refreshToken,
    ip: null,
    userAgent: null,
  } satisfies IShoppingMallGuestUserRefresh.IRequest;

  const refreshedBeforeDelete: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: preDeleteRefreshBody,
    });
  typia.assert(refreshedBeforeDelete);

  // 3. Establish platform admin context for the admin-only guest update
  const adminJoin = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoin,
    });
  typia.assert(admin);

  // 4. Soft delete the guest user via platform admin endpoint
  const updatedGuest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.update(
      connection,
      {
        guestUserId: guestId,
        body: {
          deleted_at: new Date().toISOString(),
        } satisfies IShoppingMallGuestUser.IUpdate,
      },
    );
  typia.assert(updatedGuest);

  TestValidator.equals(
    "guest user id remains the same after soft delete",
    updatedGuest.id,
    guestId,
  );

  TestValidator.predicate(
    "guest user deleted_at must be set after soft delete",
    updatedGuest.deleted_at !== null && updatedGuest.deleted_at !== undefined,
  );

  // 5. Attempt to refresh using the old token after soft delete
  const postDeleteRefreshBody = {
    refreshToken,
    ip: null,
    userAgent: null,
  } satisfies IShoppingMallGuestUserRefresh.IRequest;

  await TestValidator.error(
    "guest refresh must fail after soft deletion",
    async () => {
      await api.functional.auth.guestUser.refresh(connection, {
        body: postDeleteRefreshBody,
      });
    },
  );
}
