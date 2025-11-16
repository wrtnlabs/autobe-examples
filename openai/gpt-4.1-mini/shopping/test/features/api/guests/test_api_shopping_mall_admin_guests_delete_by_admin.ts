import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test the deletion of a guest user by an admin through the
 * /shoppingMall/admin/guests/{guestId} endpoint. This includes admin join for
 * authentication, guest user creation, guest deletion, and enforcement of
 * authorization on the deletion operation.
 *
 * Steps:
 *
 * 1. Authenticate and register a new admin user.
 * 2. Create a new guest user.
 * 3. Delete the newly created guest user as the admin.
 * 4. Attempt to delete a guest user without admin authorization and confirm
 *    failure.
 */
export async function test_api_shopping_mall_admin_guests_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication via /auth/admin/join
  const adminCreate = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    name: RandomGenerator.name(),
    password: "StrongP@ssw0rd123",
    phone_number: null,
    role: "superadmin",
  } satisfies IShoppingMallAdmin.ICreate;

  // Register and receive authorized admin user
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(adminAuthorized);

  // 2. Create guest user via /shoppingMall/guests
  const guestCreate = {
    device_info: "Test Device Model",
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    session_id: RandomGenerator.alphaNumeric(24),
  } satisfies IShoppingMallGuest.ICreate;

  const guestCreated: IShoppingMallGuest =
    await api.functional.shoppingMall.guests.create(connection, {
      body: guestCreate,
    });
  typia.assert(guestCreated);

  typia.assert(guestCreated.id!);

  // 3. Delete the created guest as admin via /shoppingMall/admin/guests/{guestId}
  await api.functional.shoppingMall.admin.guests.erase(connection, {
    guestId: guestCreated.id,
  });

  // 4. Test authorization enforcement: attempt deletion without admin
  // Simulate unauthenticated connection by clearing headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.shoppingMall.admin.guests.erase(
        unauthenticatedConnection,
        {
          guestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
