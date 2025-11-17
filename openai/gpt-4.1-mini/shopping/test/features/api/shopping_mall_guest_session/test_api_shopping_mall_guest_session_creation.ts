import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";

/**
 * Test the creation of a new guest session linked to an existing shopping mall
 * guest user.
 *
 * This test follows the natural business process for anonymous guest tracking.
 *
 * Steps:
 *
 * 1. Create a shopping mall guest user with empty create body.
 * 2. Create a shopping mall guest session associated with the above guest.
 * 3. Provide realistic IP, href, and referrer values for the session.
 * 4. Assert the session creation response has correct guest ID and provided
 *    metadata.
 */
export async function test_api_shopping_mall_guest_session_creation(
  connection: api.IConnection,
) {
  // 1. Create the guest user
  const guest: IShoppingMallGuest =
    await api.functional.shoppingMall.shoppingMallGuests.create(connection, {
      body: {} satisfies IShoppingMallGuest.ICreate,
    });
  typia.assert(guest);

  // Prepare session data
  const ip = `${typia.random<string>()}`;
  const href = `https://example.com/shop?session=${guest.id}`;
  const referrer = `https://google.com/search?q=shopping`;

  // 2. Create the guest session linked to the guest user
  const session: IShoppingMallGuestSession =
    await api.functional.shoppingMall.shoppingMallGuests.shoppingMallGuestSessions.create(
      connection,
      {
        shoppingMallGuestId: guest.id,
        body: {
          ip,
          href,
          referrer,
          expired_at: null,
        } satisfies IShoppingMallGuestSession.ICreate,
      },
    );
  typia.assert(session);

  // 3. Validate session fields
  TestValidator.equals(
    "session shoppingMallGuestId matches created guest.id",
    session.shopping_mall_guest_id,
    guest.id,
  );
  TestValidator.equals("session ip matches input", session.ip, ip);
  TestValidator.equals("session href matches input", session.href, href);
  TestValidator.equals(
    "session referrer matches input",
    session.referrer,
    referrer,
  );
  TestValidator.predicate(
    "session has created_at timestamp",
    session.created_at !== null && session.created_at !== undefined,
  );
  TestValidator.equals("session expired_at is null", session.expired_at, null);
}
