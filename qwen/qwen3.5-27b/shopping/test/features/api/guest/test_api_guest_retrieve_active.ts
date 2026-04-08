import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving an active guest account by their unique identifier.
 *
 * Validates the complete guest retrieval flow including guest account creation through device fingerprint registration and subsequent retrieval of the active guest record. Ensures that the retrieved guest account contains all required fields with correct data types and that the guest is in an active state (not soft-deleted).
 *
 * Special attention is given to verifying that the guestId parameter correctly references the created guest, that the device_fingerprint is properly maintained, and that timestamps are in valid ISO 8601 format with correct chronological ordering.
 *
 * 1. Create a guest account by calling POST /shoppingMall/auth/guest/join with session context data (href, referrer, ip).
 * 2. Capture the guestId from the authorization response.
 * 3. Create a new connection for guest operations using the base connection.
 * 4. Call GET /shoppingMall/guests/{guestId} with the captured guestId.
 * 5. Validate response contains IShoppingMallGuest with all required fields.
 * 6. Verify id matches the original guestId parameter.
 * 7. Verify device_fingerprint is a non-empty string.
 * 8. Verify created_at and updated_at are valid timestamps.
 * 9. Verify deleted_at is null (guest is active).
 * 10. Verify timestamps are in correct chronological order.
 */
export async function test_api_guest_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(guestAuth);
  const guestId: string & tags.Format<"uuid"> = guestAuth.id;
  // 2. Retrieve the active guest
  const guest = await api.functional.shoppingMall.guests.at(guestConnection, {
    guestId,
  });
  typia.assert(guest);
  // 3. Validate guest data
  TestValidator.equals("guest id matches", guest.id, guestId);
  TestValidator.predicate(
    "device_fingerprint is non-empty",
    guest.device_fingerprint.length > 0,
  );
  TestValidator.equals("deleted_at is null (active)", guest.deleted_at, null);
  TestValidator.predicate(
    "created_at <= updated_at",
    new Date(guest.created_at).getTime() <=
      new Date(guest.updated_at).getTime(),
  );
}
