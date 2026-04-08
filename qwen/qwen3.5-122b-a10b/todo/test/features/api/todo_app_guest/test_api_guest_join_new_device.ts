import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest account creation with new device fingerprint.
 *
 * Validates the complete guest registration flow when a new device accesses the system. Ensures that a unique guest account is created with proper device fingerprint tracking, timestamps are correctly set, and JWT authorization tokens are returned with valid expiration information.
 *
 * The test verifies that the guest registration endpoint properly handles new device identification, creates the necessary database records, and returns all required authorization data for subsequent authenticated requests.
 *
 * 1. Generate unique device fingerprint and session context (href, referrer, ip).
 * 2. Call guest join endpoint with the generated fingerprint.
 * 3. Validate guest account has unique UUID and matches input fingerprint.
 * 4. Verify timestamps are set correctly (created_at, updated_at).
 * 5. Confirm deleted_at is null indicating active account.
 * 6. Validate authorization token structure with access, refresh, and expiration fields.
 * 7. Ensure token expiration timestamps are in the future.
 * 8. Verify response type matches ITodoAppGuest.IAuthorized exactly.
 */
export async function test_api_guest_join_new_device(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate unique device fingerprint and session context
  const deviceFingerprint: string = RandomGenerator.alphaNumeric(16);
  const joinInput = {
    device_fingerprint: deviceFingerprint,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppGuest.IJoin;
  // Join as guest using utility function
  const guestAuth: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    { body: joinInput },
  );
  // Validate response structure
  typia.assert(guestAuth);
  // 1. Validate guest has unique UUID
  TestValidator.predicate("guest has valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guestAuth.id,
    ),
  );
  // 2. Validate device fingerprint matches input
  TestValidator.equals(
    "device fingerprint matches",
    guestAuth.device_fingerprint,
    deviceFingerprint,
  );
  // 3. Validate timestamps are set and valid
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    () => !isNaN(Date.parse(guestAuth.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    () => !isNaN(Date.parse(guestAuth.updated_at)),
  );
  // 4. Verify deleted_at is null (active account)
  TestValidator.equals(
    "account is active (deleted_at is null)",
    guestAuth.deleted_at,
    null,
  );
  // 5. Validate authorization token structure
  TestValidator.predicate(
    "token has access field",
    () =>
      typeof guestAuth.token.access === "string" &&
      guestAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh field",
    () =>
      typeof guestAuth.token.refresh === "string" &&
      guestAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expired_at field",
    () => !isNaN(Date.parse(guestAuth.token.expired_at)),
  );
  TestValidator.predicate(
    "token has refreshable_until field",
    () => !isNaN(Date.parse(guestAuth.token.refreshable_until)),
  );
  // 6. Ensure token expiration timestamps are in the future
  const now = new Date();
  TestValidator.predicate(
    "access token expires in the future",
    () => new Date(guestAuth.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refreshable until is in the future",
    () => new Date(guestAuth.token.refreshable_until) > now,
  );
  // 7. Verify refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    () =>
      new Date(guestAuth.token.refreshable_until) >=
      new Date(guestAuth.token.expired_at),
  );
}
