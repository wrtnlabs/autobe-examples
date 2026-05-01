import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test idempotent guest join behavior when a returning visitor is identified by the same device fingerprint.
 *
 * Verifies that when a guest with a known device_fingerprint joins again, the existing guest record is reused rather than creating a duplicate. The test pre-conditions the database by calling the join endpoint twice with the same fingerprint — the first call creates the guest with one session, and the second call should reuse the existing guest while appending a new session.
 *
 * Validates that the guest identity remains consistent across multiple joins: the guest id and device_fingerprint are unchanged, the created_at timestamp stays at the original creation time, and the updated_at timestamp advances to reflect the new session. The sessions array follows an append-only audit trail pattern, growing from one session to two sessions without modifying the original session.
 *
 * Also confirms that a fresh JWT token pair is issued with each join — the access token, refresh token, and their respective expiration timestamps all differ from the previous issuance, ensuring proper rotation of credentials for each session.
 *
 * 1. Create a deterministic device fingerprint value for consistent identification.
 * 2. Register a new guest visitor using authorize_guest_join with the fingerprint.
 * 3. Register again with the same fingerprint — the existing guest record should be reused.
 * 4. Validate guest id and device_fingerprint match across both registrations.
 * 5. Confirm sessions array contains exactly two session records (original + new).
 * 6. Verify created_at is unchanged while updated_at reflects the new session.
 * 7. Verify token pair is freshly issued with distinct expiration timestamps.
 */
export async function test_api_guest_join_returning_idempotent(
  connection: api.IConnection,
): Promise<void> {
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const firstConnection: api.IConnection = { host: connection.host };
  const firstResult = await authorize_guest_join(firstConnection, {
    body: { device_fingerprint: deviceFingerprint },
  });
  typia.assert(firstResult);
  const secondConnection: api.IConnection = { host: connection.host };
  const secondResult = await authorize_guest_join(secondConnection, {
    body: { device_fingerprint: deviceFingerprint },
  });
  typia.assert(secondResult);
  TestValidator.equals("guest id reused", firstResult.id, secondResult.id);
  TestValidator.equals(
    "device fingerprint unchanged",
    firstResult.device_fingerprint,
    secondResult.device_fingerprint,
  );
  TestValidator.equals("append-only sessions", secondResult.sessions.length, 2);
  TestValidator.equals(
    "created_at preserved",
    firstResult.created_at,
    secondResult.created_at,
  );
  TestValidator.notEquals(
    "updated_at reflects new session",
    firstResult.updated_at,
    secondResult.updated_at,
  );
  TestValidator.notEquals(
    "fresh access token",
    firstResult.token.access,
    secondResult.token.access,
  );
  TestValidator.notEquals(
    "fresh refresh token",
    firstResult.token.refresh,
    secondResult.token.refresh,
  );
  TestValidator.notEquals(
    "new access expiration",
    firstResult.token.expired_at,
    secondResult.token.expired_at,
  );
  TestValidator.notEquals(
    "new refreshable until",
    firstResult.token.refreshable_until,
    secondResult.token.refreshable_until,
  );
}
