import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving an existing active guest account by UUID.
 *
 * Validates the complete guest retrieval workflow including guest registration via device fingerprint and subsequent account lookup by ID. Ensures that the retrieval endpoint returns accurate guest information with all required fields properly populated.
 *
 * Special attention is given to verifying that the guest account is in an active state (deleted_at is null) and that all timestamp fields conform to ISO 8601 date-time format. The test also validates that the sessions array is present, though it may be empty or contain guest session records.
 *
 * 1. Create a guest connection and register a guest using device fingerprint authentication.
 * 2. Extract the guest ID from the registration response.
 * 3. Call the guest retrieval endpoint with the extracted guest ID.
 * 4. Validate the response structure and field types using typia.assert.
 * 5. Verify the guest ID matches the requested ID.
 * 6. Verify device_fingerprint is a non-empty string.
 * 7. Verify deleted_at is null for an active guest account.
 * 8. Verify sessions is an array.
 */
export async function test_api_guest_retrieve_by_id_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and register guest
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: undefined,
  });
  typia.assert(authorized);
  // 2. Extract guest ID from registration response
  const guestId: string = authorized.id;
  // 3. Retrieve guest by ID
  const guest = await api.functional.redditClone.guests.at(guestConnection, {
    guestId,
  });
  typia.assert(guest);
  // 4. Verify guest ID matches
  TestValidator.equals("guest ID matches", guest.id, guestId);
  // 5. Verify device_fingerprint is non-empty
  TestValidator.predicate(
    "device_fingerprint is non-empty",
    guest.device_fingerprint.length > 0,
  );
  // 6. Verify deleted_at is null for active guest
  TestValidator.equals(
    "deleted_at is null for active guest",
    guest.deleted_at,
    null,
  );
  // 7. Verify sessions is an array
  TestValidator.predicate(
    "sessions is an array",
    Array.isArray(guest.sessions),
  );
}
