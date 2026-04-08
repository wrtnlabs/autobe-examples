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
 * Test guest re-joining with an existing device fingerprint updates the guest record and invalidates previous sessions.
 *
 * Validates that when a guest joins the platform with the same device fingerprint, the existing guest record is updated rather than creating a new guest. The test verifies that previous sessions are invalidated with fresh tokens issued, while maintaining the same guest identity.
 *
 * This test ensures proper session management for guest users, confirming that device fingerprint-based identification works correctly and that token rotation occurs on re-join to invalidate previous sessions.
 *
 * 1. Create initial guest session with random session context data (href, referrer, ip).
 * 2. Store the guest ID, device fingerprint, and authorization tokens from the first join.
 * 3. Re-join with the same device fingerprint by using the same connection.
 * 4. Verify the second response contains the same guest ID and device fingerprint (existing guest updated).
 * 5. Verify the updated_at timestamp is newer than created_at (record was refreshed).
 * 6. Verify deleted_at is null (guest account remains active).
 * 7. Verify new access and refresh tokens are different from the first tokens (session invalidated).
 */
export async function test_api_guest_join_existing_device_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const firstJoin = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(firstJoin);
  // Store first session data
  const firstGuestId = firstJoin.id;
  const firstDeviceFingerprint = firstJoin.device_fingerprint;
  const firstCreatedAt = firstJoin.created_at;
  const firstUpdatedAt = firstJoin.updated_at;
  const firstAccessToken = firstJoin.token.access;
  const firstRefreshToken = firstJoin.token.refresh;
  // 2. Re-join with the same device fingerprint (same connection ensures same fingerprint)
  const secondJoin = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(secondJoin);
  // 3. Validate that guest ID is the same (existing guest updated, not new guest)
  TestValidator.equals(
    "guest ID remains the same",
    secondJoin.id,
    firstGuestId,
  );
  // 4. Validate that device fingerprint is the same
  TestValidator.equals(
    "device fingerprint remains the same",
    secondJoin.device_fingerprint,
    firstDeviceFingerprint,
  );
  // 5. Validate that created_at is unchanged (same guest record)
  TestValidator.equals(
    "created_at remains unchanged",
    secondJoin.created_at,
    firstCreatedAt,
  );
  // 6. Validate that updated_at is newer than the first updated_at
  TestValidator.predicate(
    "updated_at is refreshed",
    new Date(secondJoin.updated_at) > new Date(firstUpdatedAt),
  );
  // 7. Validate that deleted_at is null (guest still active)
  TestValidator.equals("deleted_at is null", secondJoin.deleted_at, null);
  // 8. Validate that new access token is different from the first token
  TestValidator.notEquals(
    "access token is refreshed",
    secondJoin.token.access,
    firstAccessToken,
  );
  // 9. Validate that new refresh token is different from the first token
  TestValidator.notEquals(
    "refresh token is refreshed",
    secondJoin.token.refresh,
    firstRefreshToken,
  );
  // 10. Validate that the new tokens have valid expiration timestamps
  TestValidator.predicate(
    "new access token has valid expiration",
    new Date(secondJoin.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "new refresh token has valid expiration",
    new Date(secondJoin.token.refreshable_until) > new Date(),
  );
}
