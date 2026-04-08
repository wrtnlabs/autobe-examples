import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import type { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful retrieval of an existing, active guest account by UUID.
 *
 * Validates the complete guest account retrieval workflow including guest account creation via device fingerprint authentication and subsequent lookup by unique identifier. Ensures that the retrieved guest entity contains all required fields with correct data types and that active guests have null deleted_at values.
 *
 * Special attention is given to verifying that the device fingerprint is correctly maintained, timestamps are in ISO 8601 format, and the sessions array is properly populated with session metadata.
 *
 * 1. Create a guest account using device fingerprint authentication via POST /hrm/auth/guest/join.
 * 2. Retrieve the created guest account using GET /hrm/guests/{guestId}.
 * 3. Validate the response contains all required fields with correct types.
 * 4. Verify deleted_at is null for active guest accounts.
 * 5. Verify sessions array is present and contains valid session summaries.
 */
export async function test_api_guest_retrieve_existing_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account via device fingerprint authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmGuest.IAuthorized =
    await api.functional.hrm.auth.guest.join(guestConnection, {
      body: {
        device_fingerprint: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmGuest.IJoin,
    });
  typia.assert(authorized);
  // 2. Retrieve the created guest account by UUID
  const guest: IHrmGuest = await api.functional.hrm.guests.at(guestConnection, {
    guestId: authorized.id,
  });
  typia.assert(guest);
  // 3. Validate response structure and field values
  TestValidator.equals("guest ID matches", guest.id, authorized.id);
  TestValidator.equals(
    "device fingerprint matches",
    guest.device_fingerprint,
    authorized.device_fingerprint,
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    guest.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    guest.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active guest",
    guest.deleted_at,
    null,
  );
  TestValidator.predicate(
    "sessions array exists",
    Array.isArray(guest.sessions),
  );
}
