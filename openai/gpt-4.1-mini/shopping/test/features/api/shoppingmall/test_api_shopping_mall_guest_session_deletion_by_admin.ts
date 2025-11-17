import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";

export async function test_api_shopping_mall_guest_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a shopping mall guest (empty payload as per IShoppingMallGuest.ICreate)
  const guest: IShoppingMallGuest =
    await api.functional.shoppingMall.shoppingMallGuests.create(connection, {
      body: {} satisfies IShoppingMallGuest.ICreate,
    });
  typia.assert(guest);

  // 2. Create a shopping mall guest session for the guest
  const sessionBody = {
    ip: RandomGenerator.pick(["192.168.1.1", "10.0.0.1", "172.16.0.1"]),
    href: "https://example-shoppingMall.com/home",
    referrer: "https://example-search.com",
    expired_at: null,
  } satisfies IShoppingMallGuestSession.ICreate;

  const guestSession: IShoppingMallGuestSession =
    await api.functional.shoppingMall.shoppingMallGuests.shoppingMallGuestSessions.create(
      connection,
      {
        shoppingMallGuestId: guest.id,
        body: sessionBody,
      },
    );
  typia.assert(guestSession);

  // 3. Authenticate as shopping mall admin via join
  const adminJoinBody = {
    email: `admin+${typia.random<string & tags.Format<"email">>().replace(/@.*$/, "@example.com")}`,
    password: "strongSecureP@ssw0rd",
    ip: "127.0.0.1",
    href: "https://example-shoppingMall.com/admin/join",
    referrer: "https://example-shoppingMall.com/login",
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 4. Delete the created guest session as authorized admin
  await api.functional.shoppingMall.admin.shoppingMallGuests.shoppingMallGuestSessions.erase(
    connection,
    {
      shoppingMallGuestId: guest.id,
      shoppingMallGuestSessionId: guestSession.id,
    },
  );
}
