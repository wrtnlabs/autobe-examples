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
 * Test that retrieving a soft-deleted guest account returns HTTP 404 Not Found.
 *
 * Validates that guest accounts which have been soft-deleted (deleted_at IS NOT NULL) are treated as non-existent by the API. When a guest account is soft-deleted, the GET /redditClone/guests/{guestId} endpoint should return a 404 status code, effectively hiding the deleted account from all API access.
 *
 * This test creates a valid guest account first to establish a working baseline, then validates the 404 behavior. Since we cannot directly soft-delete through the API (no admin endpoint available for guest deletion), we test the 404 response using a non-existent guest ID. The API specification states that soft-deleted guests (deleted_at IS NOT NULL) should be treated as not found and return 404, which is the same behavior as non-existent guests.
 *
 * 1. Create a guest account using authorize_guest_join utility to obtain a valid guest ID
 * 2. Validate the guest was created successfully with typia.assert
 * 3. Successfully retrieve the active guest to verify the API works correctly
 * 4. Verify retrieved guest data matches the created guest
 * 5. Test 404 behavior with a non-existent guest ID (simulating soft-deleted guest behavior)
 * 6. Use TestValidator.httpError to validate the 404 status code is returned
 */
export async function test_api_guest_retrieve_soft_deleted_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest account to get a valid guest ID
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guest);
  // 2. Validate guest creation
  TestValidator.predicate("guest has valid ID", guest.id.length > 0);
  TestValidator.predicate(
    "guest has device fingerprint",
    guest.device_fingerprint.length > 0,
  );
  // 3. Successfully retrieve the active guest to verify API works
  const retrievedGuest = await api.functional.redditClone.guests.at(
    guestConnection,
    {
      guestId: guest.id,
    },
  );
  typia.assert(retrievedGuest);
  // 4. Verify retrieved guest matches created guest
  TestValidator.equals("guest ID matches", retrievedGuest.id, guest.id);
  TestValidator.equals(
    "device fingerprint matches",
    retrievedGuest.device_fingerprint,
    guest.device_fingerprint,
  );
  // 5. Test 404 behavior with a non-existent guest ID
  // This simulates the behavior expected for soft-deleted guests (deleted_at IS NOT NULL)
  const nonExistentGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "non-existent or soft-deleted guest returns 404",
    404,
    async () =>
      await api.functional.redditClone.guests.at(guestConnection, {
        guestId: nonExistentGuestId,
      }),
  );
}
