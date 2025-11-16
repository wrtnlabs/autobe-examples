import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform admin can update their lifecycle status and that the
 * change is persisted across detail reads.
 *
 * Business flow:
 *
 * 1. Join as a new platform admin via POST /auth/platformAdmin/join.
 * 2. Optionally create a guest user via POST
 *    /shoppingMall/platformAdmin/guestUsers to exercise dependencies.
 * 3. Compute a new lifecycle status string different from the initial one.
 * 4. Call PUT /shoppingMall/platformAdmin/platformAdmins/{platformAdminId} with a
 *    body that only updates the `status` field.
 * 5. Verify that the response reflects the new status and an updated timestamp.
 * 6. Re-read the admin profile via GET
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}.
 * 7. Verify that the persisted record has the same status and isActive flag as the
 *    update response.
 */
export async function test_api_platform_admin_profile_update_status_lifecycle(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin (also establishes Authorization header)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin-shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const joined: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Optionally create a guest user to exercise dependency
  const guestBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent: "Mozilla/5.0 (E2E Test GuestUser)",
  } satisfies IShoppingMallGuestUser.ICreate;

  const guest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      { body: guestBody },
    );
  typia.assert(guest);

  // 3. Compute a new lifecycle status different from the initial one
  const originalStatus: string = joined.status;
  const nextStatus: string =
    originalStatus === "active" ? "suspended" : "active";

  // 4. Update the platform admin's status via PUT update
  const updateBody = {
    status: nextStatus,
  } satisfies IShoppingMallPlatformAdmin.IUpdate;

  const updated: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.update(
      connection,
      {
        platformAdminId: joined.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Validate response reflects new status and updated timestamp
  TestValidator.equals(
    "updated admin id should match joined id",
    updated.id,
    joined.id,
  );

  TestValidator.equals(
    "status should be updated to nextStatus",
    updated.status,
    nextStatus,
  );

  TestValidator.notEquals(
    "updatedAt should change after status update",
    updated.updatedAt,
    joined.updatedAt,
  );

  // 6. Re-read the admin profile via GET detail endpoint
  const reloaded: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.at(
      connection,
      {
        platformAdminId: joined.id,
      },
    );
  typia.assert(reloaded);

  // 7. Validate persistence and consistency of lifecycle fields
  TestValidator.equals(
    "reloaded id should match updated id",
    reloaded.id,
    updated.id,
  );

  TestValidator.equals(
    "reloaded status should match updated status",
    reloaded.status,
    updated.status,
  );

  TestValidator.equals(
    "reloaded isActive should match updated isActive",
    reloaded.isActive,
    updated.isActive,
  );

  TestValidator.equals(
    "reloaded updatedAt should match updated updatedAt",
    reloaded.updatedAt,
    updated.updatedAt,
  );
}
