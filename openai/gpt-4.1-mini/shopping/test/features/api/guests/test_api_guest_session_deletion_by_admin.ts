import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";

export async function test_api_guest_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: adminPassword,
        phone_number: null,
        role: "superadmin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a guest user
  const guestCreateBody = {
    session_id: RandomGenerator.alphaNumeric(16),
    device_info: "Browser Test Device",
    ip_address: "192.168.1.100",
  } satisfies IShoppingMallGuest.ICreate;
  const guest: IShoppingMallGuest =
    await api.functional.shoppingMall.guests.create(connection, {
      body: guestCreateBody,
    });
  typia.assert(guest);

  // 3. Create a guest session for the guest
  const guestSessionCreateBody = {
    ip: "192.168.1.100",
    href: "https://example.com/home",
    referrer: "https://google.com",
  } satisfies IShoppingMallGuestSession.ICreate;
  const guestSession: IShoppingMallGuestSession =
    await api.functional.shoppingMall.guests.guestSessions.create(connection, {
      guestId: guest.id,
      body: guestSessionCreateBody,
    });
  typia.assert(guestSession);

  // 4. Attempt to delete the guest session without admin authentication (unauthorized)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized guest session deletion should fail",
    async () => {
      await api.functional.shoppingMall.admin.guests.guestSessions.eraseGuestSession(
        unauthenticatedConnection,
        {
          guestId: guest.id,
          guestSessionId: guestSession.id,
        },
      );
    },
  );

  // 5. Delete the guest session as authenticated admin
  await api.functional.shoppingMall.admin.guests.guestSessions.eraseGuestSession(
    connection,
    {
      guestId: guest.id,
      guestSessionId: guestSession.id,
    },
  );

  // 6. Attempt to delete the same guest session again - expect error since it no longer exists
  await TestValidator.error(
    "deleting a non-existent guest session should fail",
    async () => {
      await api.functional.shoppingMall.admin.guests.guestSessions.eraseGuestSession(
        connection,
        {
          guestId: guest.id,
          guestSessionId: guestSession.id,
        },
      );
    },
  );
}
