import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";

export async function test_api_create_guest_session_with_valid_guest(
  connection: api.IConnection,
) {
  // Create a new guest user.
  const guestCreateBody = {
    session_id: RandomGenerator.alphaNumeric(12),
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    device_info: "Automated Test Device",
  } satisfies IShoppingMallGuest.ICreate;

  const guest: IShoppingMallGuest =
    await api.functional.shoppingMall.guests.create(connection, {
      body: guestCreateBody,
    });
  typia.assert(guest);

  // Create guest session associated with the created guest.
  const href = `https://example.com/page/${RandomGenerator.alphaNumeric(6)}`;
  const referrer = `https://referrer.example.com/ref/${RandomGenerator.alphaNumeric(6)}`;
  const guestSessionCreateBody = {
    ip: guestCreateBody.ip_address,
    href: href as string & tags.Format<"uri">,
    referrer: referrer as string & tags.Format<"uri">,
  } satisfies IShoppingMallGuestSession.ICreate;

  const guestSession: IShoppingMallGuestSession =
    await api.functional.shoppingMall.guests.guestSessions.create(connection, {
      guestId: guest.id,
      body: guestSessionCreateBody,
    });
  typia.assert(guestSession);

  // Validations
  TestValidator.equals(
    "GuestSession guestId matches Guest id",
    guestSession.guest_id,
    guest.id,
  );
  TestValidator.equals(
    "GuestSession ip matches guest ip",
    guestSession.ip,
    guestCreateBody.ip_address,
  );
  TestValidator.equals(
    "GuestSession href matches provided href",
    guestSession.href,
    href,
  );
  TestValidator.equals(
    "GuestSession referrer matches provided referrer",
    guestSession.referrer,
    referrer,
  );
  TestValidator.predicate(
    "GuestSession is_active flag is true",
    guestSession.is_active,
  );
}
