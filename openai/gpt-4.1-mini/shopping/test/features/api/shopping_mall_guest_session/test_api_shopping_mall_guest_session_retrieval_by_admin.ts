import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";

export async function test_api_shopping_mall_guest_session_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "1234",
        ip: null,
        href: "https://example.com/admin-join",
        referrer: "https://referrer.example.com/",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a guest user
  const guest: IShoppingMallGuest =
    await api.functional.shoppingMall.shoppingMallGuests.create(connection, {
      body: {} satisfies IShoppingMallGuest.ICreate,
    });
  typia.assert(guest);

  // 3. Create a guest session tied to the created guest
  const guestSessionCreateBody = {
    ip: "192.168.1.100",
    href: "https://example.com/guest-session",
    referrer: "https://referrer.example.com/",
    expired_at: null,
  } satisfies IShoppingMallGuestSession.ICreate;

  const guestSession: IShoppingMallGuestSession =
    await api.functional.shoppingMall.shoppingMallGuests.shoppingMallGuestSessions.create(
      connection,
      {
        shoppingMallGuestId: guest.id,
        body: guestSessionCreateBody,
      },
    );
  typia.assert(guestSession);

  // 4. Retrieve the guest session by admin API and verify
  const retrievedSession: IShoppingMallGuestSession =
    await api.functional.shoppingMall.admin.shoppingMallGuests.shoppingMallGuestSessions.at(
      connection,
      {
        shoppingMallGuestId: guest.id,
        shoppingMallGuestSessionId: guestSession.id,
      },
    );
  typia.assert(retrievedSession);

  // Validate business logic
  TestValidator.equals(
    "retrieved session id equals created session id",
    retrievedSession.id,
    guestSession.id,
  );
  TestValidator.equals(
    "retrieved session guest id equals created guest id",
    retrievedSession.shopping_mall_guest_id,
    guest.id,
  );
  TestValidator.equals(
    "retrieved session ip equals created session ip",
    retrievedSession.ip,
    guestSessionCreateBody.ip,
  );
  TestValidator.equals(
    "retrieved session href equals created session href",
    retrievedSession.href,
    guestSessionCreateBody.href,
  );
  TestValidator.equals(
    "retrieved session referrer equals created session referrer",
    retrievedSession.referrer,
    guestSessionCreateBody.referrer,
  );
  TestValidator.equals(
    "retrieved session created_at equals created session created_at",
    retrievedSession.created_at,
    guestSession.created_at,
  );
  TestValidator.equals(
    "retrieved session expired_at equals created session expired_at",
    retrievedSession.expired_at,
    guestSessionCreateBody.expired_at,
  );
}
