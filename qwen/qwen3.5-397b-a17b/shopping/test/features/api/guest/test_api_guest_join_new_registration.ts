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
 * Test successful guest registration for a new user with a unique device fingerprint.
 *
 * Validates the complete guest registration flow including device fingerprint submission, account creation, and JWT token generation. Ensures that new guest accounts receive proper authentication credentials and that all response fields conform to the IShoppingMallGuest.IAuthorized structure.
 *
 * Special attention is given to verifying that the device_fingerprint is correctly stored and returned, that the guest account receives a unique UUID identifier, and that the session tokens have appropriate expiration times for guest security (typically 24 hours).
 *
 * 1. Generate unique device fingerprint for guest identification.
 * 2. Call guest join endpoint with device fingerprint and optional metadata.
 * 3. Validate response structure matches IShoppingMallGuest.IAuthorized.
 * 4. Verify device_fingerprint matches the requested value.
 * 5. Verify timestamps are properly set on account creation.
 * 6. Verify deleted_at is null indicating active account.
 * 7. Verify token contains all required fields with valid expiration times.
 * 8. Verify session expiration is set to future timestamp for valid guest session.
 */
export async function test_api_guest_join_new_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate unique device fingerprint
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // 2. Create guest connection and register
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  // 3. Validate response structure
  typia.assert(guest);
  // 4. Verify device_fingerprint matches input
  TestValidator.equals(
    "device fingerprint matches",
    guest.device_fingerprint,
    deviceFingerprint,
  );
  // 5. Verify timestamps are set (created_at and updated_at should be equal on creation)
  TestValidator.equals(
    "created_at equals updated_at on creation",
    guest.created_at,
    guest.updated_at,
  );
  // 6. Verify account is active (not soft-deleted)
  TestValidator.equals("deleted_at is null", guest.deleted_at, null);
  // 7. Verify token structure has all required fields
  TestValidator.predicate(
    "access token is non-empty",
    guest.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    guest.token.refresh.length > 0,
  );
  // 8. Verify session expiration is in the future
  const expiredAt = new Date(guest.token.expired_at);
  const refreshableUntil = new Date(guest.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate("expired_at is in future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    refreshableUntil >= expiredAt,
  );
}
