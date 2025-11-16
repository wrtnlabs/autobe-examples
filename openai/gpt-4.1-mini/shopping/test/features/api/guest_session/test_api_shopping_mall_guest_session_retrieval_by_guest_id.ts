import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";

export async function test_api_shopping_mall_guest_session_retrieval_by_guest_id(
  connection: api.IConnection,
) {
  // 1. Create a guest user
  const guestCreateBody = {
    session_id: RandomGenerator.alphaNumeric(12),
    device_info: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.ICreate;

  const guest: IShoppingMallGuest =
    await api.functional.shoppingMall.guests.create(connection, {
      body: guestCreateBody,
    });
  typia.assert(guest);

  // 2. Create a guest session under the guest user
  const guestSessionCreateBody = {
    ip: guestCreateBody.ip_address,
    href: `https://example.com/shop/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://google.com/search?q=${RandomGenerator.alphaNumeric(5)}`,
  } satisfies IShoppingMallGuestSession.ICreate;

  const session: IShoppingMallGuestSession =
    await api.functional.shoppingMall.guests.guestSessions.create(connection, {
      guestId: guest.id,
      body: guestSessionCreateBody,
    });
  typia.assert(session);

  // 3. Retrieve the guest session by guestId and guestSessionId
  const retrievedSession: IShoppingMallGuestSession =
    await api.functional.shoppingMall.guests.guestSessions.at(connection, {
      guestId: guest.id,
      guestSessionId: session.id,
    });
  typia.assert(retrievedSession);

  // Validate that the retrieved session matches the created session
  TestValidator.equals(
    "guest session id equals",
    retrievedSession.id,
    session.id,
  );
  TestValidator.equals(
    "guest session guestId equals",
    retrievedSession.guest_id,
    guest.id,
  );
  TestValidator.equals(
    "guest session ip equals",
    retrievedSession.ip ?? null,
    guestSessionCreateBody.ip ?? null,
  );
  TestValidator.equals(
    "guest session href equals",
    retrievedSession.href,
    guestSessionCreateBody.href,
  );
  TestValidator.equals(
    "guest session referrer equals",
    retrievedSession.referrer,
    guestSessionCreateBody.referrer,
  );
  TestValidator.equals(
    "guest session is_active is true",
    retrievedSession.is_active,
    true,
  );
}
