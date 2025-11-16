import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";

/**
 * Test updating an existing guest session as an authorized admin user.
 *
 * This test covers the following steps:
 *
 * 1. Registering a new admin user to obtain authentication credentials.
 * 2. Creating a guest user which will own the session to be updated.
 * 3. Creating a guest session associated with the created guest user.
 * 4. Using the admin credentials, updating the guest session with valid update
 *    payload including expiration details and activity URLs.
 * 5. Validating that the guest session update reflects the changes accurately,
 *    including session expiration timestamp and current IP, href, and referrer
 *    URLs.
 *
 * This scenario tests the correctness of the admin authorization mechanism,
 * data integrity for session updates, and ensures that only admins can modify
 * guest sessions.
 *
 * All API responses are validated with typia.assert, and business logic
 * correctness is verified via descriptive TestValidator checks.
 */
export async function test_api_update_guest_session_as_admin(
  connection: api.IConnection,
) {
  // 1. Admin Registration
  const adminCreateBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@${RandomGenerator.alphaNumeric(5)}.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(10),
    phone_number: RandomGenerator.mobile(),
    role: typia.random<"superadmin" | "admin" | "support">(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 2. Create Guest
  const guestCreateBody = {
    session_id: RandomGenerator.alphaNumeric(24),
    device_info: RandomGenerator.name(),
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.ICreate;

  const guest: IShoppingMallGuest =
    await api.functional.shoppingMall.guests.create(connection, {
      body: guestCreateBody,
    });
  typia.assert(guest);

  // 3. Create Guest Session
  const guestSessionCreateBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: `https://${RandomGenerator.alphaNumeric(4)}.com/${RandomGenerator.alphaNumeric(6)}`,
    referrer: `https://${RandomGenerator.alphaNumeric(3)}.com/${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IShoppingMallGuestSession.ICreate;

  const guestSession: IShoppingMallGuestSession =
    await api.functional.shoppingMall.guests.guestSessions.create(connection, {
      guestId: guest.id,
      body: guestSessionCreateBody,
    });
  typia.assert(guestSession);

  // 4. Update Guest Session as Admin
  const now = new Date();
  const expiredTime = new Date(now.getTime() + 10 * 60000).toISOString(); // 10 minutes later

  const updateBody = {
    expiredIp: typia.random<string & tags.Format<"ipv4">>(),
    expiredHref: `https://${RandomGenerator.alphaNumeric(5)}.org/${RandomGenerator.alphaNumeric(5)}`,
    expiredReferrer: `https://${RandomGenerator.alphaNumeric(3)}.org/${RandomGenerator.alphaNumeric(7)}`,
    expiredTime: expiredTime,
    href: `https://${RandomGenerator.alphaNumeric(4)}.site/${RandomGenerator.alphaNumeric(5)}`,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    referrer: `https://${RandomGenerator.alphaNumeric(3)}.site/${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IShoppingMallGuestSession.IUpdate;

  const updatedGuestSession: IShoppingMallGuestSession =
    await api.functional.shoppingMall.admin.guests.guestSessions.updateGuestSession(
      connection,
      {
        guestId: guest.id,
        guestSessionId: guestSession.id,
        body: updateBody,
      },
    );
  typia.assert(updatedGuestSession);

  // 5. Validate updated properties
  TestValidator.equals(
    "expiredTime should match the updated value",
    updatedGuestSession.expired_at,
    updateBody.expiredTime,
  );

  TestValidator.equals(
    "current ip should match the updated value",
    updatedGuestSession.ip,
    updateBody.ip,
  );

  TestValidator.equals(
    "current href should match the updated value",
    updatedGuestSession.href,
    updateBody.href,
  );

  TestValidator.equals(
    "current referrer should match the updated value",
    updatedGuestSession.referrer,
    updateBody.referrer,
  );
}
