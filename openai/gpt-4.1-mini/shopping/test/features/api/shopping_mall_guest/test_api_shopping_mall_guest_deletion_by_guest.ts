import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_shopping_mall_guest_deletion_by_guest(
  connection: api.IConnection,
) {
  // 1. Authenticate as a guest user by joining
  const guestAuth: IShoppingMallGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        name: RandomGenerator.name(),
        email: RandomGenerator.alphaNumeric(5) + "@example.com",
        ip: null,
        href: "https://example.com/home",
        referrer: "https://google.com/",
        password: "guest_password123",
      } satisfies IShoppingMallGuest.IJoin,
    });
  typia.assert(guestAuth);

  // 2. Create a new shopping mall guest user
  const guest: IShoppingMallGuest =
    await api.functional.shoppingMall.shoppingMallGuests.create(connection, {
      body: {},
    });
  typia.assert(guest);

  // 3. Delete the created shopping mall guest user by their id
  await api.functional.shoppingMall.guest.shoppingMallGuests.erase(connection, {
    shoppingMallGuestId: guest.id,
  });

  // There is no response body for deletion; assertion is that no error was thrown
}
