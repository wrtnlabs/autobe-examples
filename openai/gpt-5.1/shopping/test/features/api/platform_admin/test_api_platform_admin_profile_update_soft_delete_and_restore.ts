import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate soft-delete and restore lifecycle of a platform admin profile.
 *
 * Business flow:
 *
 * 1. Join a new platform admin (this also authenticates and sets Authorization
 *    header).
 * 2. Create a baseline guest user to exercise dependency wiring.
 * 3. Fetch the admin profile via GET detail endpoint to capture baseline state.
 * 4. Soft-delete the admin by updating `deletedAt` to now and status to a
 *    closed-like flag.
 * 5. Verify the response reflects soft-deleted, inactive lifecycle state.
 * 6. Re-fetch detail to ensure persisted soft-delete matches expectations.
 * 7. Restore the admin by clearing `deletedAt` and setting status back to active.
 * 8. Verify the response and detail read show restored, active lifecycle state.
 */
export async function test_api_platform_admin_profile_update_soft_delete_and_restore(
  connection: api.IConnection,
) {
  // 1. Join a new platform admin (also authenticates and sets Authorization header)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // basic sanity: joined admin should be active and not soft-deleted
  TestValidator.predicate(
    "joined platform admin should be active",
    authorizedAdmin.isActive === true,
  );

  const platformAdminId = authorizedAdmin.id;

  // 2. Create a baseline guest user
  const guestCreateBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent: "Mozilla/5.0 (E2E Test)",
  } satisfies IShoppingMallGuestUser.ICreate;

  const guestUser: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert(guestUser);

  // 3. Fetch baseline admin profile via GET detail
  const initialAdmin: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.at(
      connection,
      {
        platformAdminId,
      },
    );
  typia.assert(initialAdmin);

  TestValidator.equals(
    "initial admin id matches authorized session id",
    initialAdmin.id,
    authorizedAdmin.id,
  );

  // 4. Soft-delete the admin via update
  const softDeleteTimestamp = new Date().toISOString();
  const closedStatus = "closed";

  const softDeleteBody = {
    status: closedStatus,
    deletedAt: softDeleteTimestamp,
  } satisfies IShoppingMallPlatformAdmin.IUpdate;

  const softDeletedAdmin: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.update(
      connection,
      {
        platformAdminId,
        body: softDeleteBody,
      },
    );
  typia.assert(softDeletedAdmin);

  // 5. Verify soft-deleted state from update response
  TestValidator.equals(
    "soft-deleted admin id matches",
    softDeletedAdmin.id,
    platformAdminId,
  );
  TestValidator.equals(
    "soft-deleted status matches closed status",
    softDeletedAdmin.status,
    closedStatus,
  );
  TestValidator.predicate(
    "soft-deleted admin should not be active",
    softDeletedAdmin.isActive === false,
  );
  TestValidator.predicate(
    "soft-deleted admin should have deletedAt set",
    typeof softDeletedAdmin.deletedAt === "string",
  );

  // 6. Re-fetch detail to ensure persisted soft-delete state
  const reloadedSoftDeleted: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.at(
      connection,
      {
        platformAdminId,
      },
    );
  typia.assert(reloadedSoftDeleted);

  TestValidator.equals(
    "reloaded soft-deleted admin status persists",
    reloadedSoftDeleted.status,
    closedStatus,
  );
  TestValidator.predicate(
    "reloaded soft-deleted admin should have deletedAt set",
    typeof reloadedSoftDeleted.deletedAt === "string",
  );
  TestValidator.predicate(
    "reloaded soft-deleted admin should not be active",
    reloadedSoftDeleted.isActive === false,
  );

  // 7. Restore the admin by clearing deletedAt and setting status to active
  const restoredStatus = "active";

  const restoreBody = {
    status: restoredStatus,
    deletedAt: undefined,
  } satisfies IShoppingMallPlatformAdmin.IUpdate;

  const restoredAdmin: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.update(
      connection,
      {
        platformAdminId,
        body: restoreBody,
      },
    );
  typia.assert(restoredAdmin);

  // 8. Verify restored active state from response and detail read
  TestValidator.equals(
    "restored admin id matches",
    restoredAdmin.id,
    platformAdminId,
  );
  TestValidator.equals(
    "restored admin status is active",
    restoredAdmin.status,
    restoredStatus,
  );
  TestValidator.predicate(
    "restored admin should be active",
    restoredAdmin.isActive === true,
  );
  TestValidator.predicate(
    "restored admin should have deletedAt cleared",
    restoredAdmin.deletedAt === undefined,
  );

  const reloadedRestored: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.at(
      connection,
      {
        platformAdminId,
      },
    );
  typia.assert(reloadedRestored);

  TestValidator.equals(
    "reloaded restored admin status persists active",
    reloadedRestored.status,
    restoredStatus,
  );
  TestValidator.predicate(
    "reloaded restored admin should be active",
    reloadedRestored.isActive === true,
  );
  TestValidator.predicate(
    "reloaded restored admin should have deletedAt cleared",
    reloadedRestored.deletedAt === undefined,
  );
}
