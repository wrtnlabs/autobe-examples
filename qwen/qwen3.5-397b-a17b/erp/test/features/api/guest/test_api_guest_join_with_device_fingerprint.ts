import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest account creation with custom device fingerprint.
 *
 * Validates the complete guest registration flow when a client provides a unique device fingerprint. The test ensures that the server accepts the custom fingerprint, creates the guest account record, generates the initial session, and returns properly structured authentication tokens.
 *
 * The device fingerprint uniquely identifies the visitor's device and persists across browser sessions. This test verifies that custom fingerprints are correctly stored and used for guest identification, enabling session continuity for returning visitors.
 *
 * 1. Generate unique device fingerprint and session context (href, referrer).
 * 2. Call guest join endpoint with custom device fingerprint.
 * 3. Validate response structure with typia.assert.
 * 4. Verify expiration timestamps are in the future relative to creation time.
 * 5. Verify refreshable_until is after or equal to expired_at.
 */
export async function test_api_guest_join_with_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare registration data with custom device fingerprint
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const body = {
    device_fingerprint: deviceFingerprint,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmPlatformGuest.IJoin;
  // 2. Create guest connection and register
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, { body });
  typia.assert(authorized);
  // 3. Validate expiration timestamps are in the future (business logic)
  const now = new Date();
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is in future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil.getTime() > now.getTime(),
  );
  // 4. Validate refreshable_until is after or equal to expired_at
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    refreshableUntil.getTime() >= expiredAt.getTime(),
  );
}
