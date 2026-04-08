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
 * Test that re-joining with an existing device fingerprint returns the existing guest's session tokens instead of creating a duplicate account.
 *
 * Validates the idempotency of guest registration by ensuring that when a guest attempts to join with a device fingerprint that already exists in the system, the backend returns the existing guest account information with refreshed session tokens rather than creating a duplicate account.
 *
 * The test verifies that the guest id remains consistent across multiple join attempts with the same fingerprint, while session tokens are properly refreshed to provide new authentication credentials. The created_at timestamp should remain unchanged (preserving the original account creation time), while the updated_at timestamp should reflect the most recent join operation.
 *
 * 1. Generate a unique device fingerprint for testing.
 * 2. First join: Register a new guest with the device fingerprint and capture the guest id, tokens, and timestamps.
 * 3. Second join: Attempt to register again with the exact same device fingerprint.
 * 4. Verify the guest id from both responses is identical (no duplicate account).
 * 5. Verify the device_fingerprint matches the original input.
 * 6. Verify the created_at timestamp is unchanged (original account creation time preserved).
 * 7. Verify the updated_at timestamp is updated (reflects the re-join operation).
 * 8. Verify new tokens are issued (access and refresh tokens differ from first join).
 * 9. Verify token expiration timestamps are valid and in the future.
 */
export async function test_api_guest_join_existing_fingerprint_returns_tokens(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a unique device fingerprint for this test
  const deviceFingerprint: string = RandomGenerator.alphaNumeric(32);
  // 2. First join: Create a new guest account
  const firstJoin: IShoppingMallGuest.IAuthorized = await authorize_guest_join(
    { host: connection.host },
    {
      body: {
        device_fingerprint: deviceFingerprint,
      } satisfies IShoppingMallGuest.IJoin,
    },
  );
  typia.assert(firstJoin);
  // Capture first join data for comparison
  const firstGuestId: string = firstJoin.id;
  const firstCreatedAt: string = firstJoin.created_at;
  const firstUpdatedAt: string = firstJoin.updated_at;
  const firstAccessToken: string = firstJoin.token.access;
  const firstRefreshToken: string = firstJoin.token.refresh;
  const firstExpiredAt: string = firstJoin.token.expired_at;
  const firstRefreshableUntil: string = firstJoin.token.refreshable_until;
  // Small delay to ensure updated_at will be different
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Second join: Attempt to register with the same device fingerprint
  const secondJoin: IShoppingMallGuest.IAuthorized = await authorize_guest_join(
    { host: connection.host },
    {
      body: {
        device_fingerprint: deviceFingerprint,
      } satisfies IShoppingMallGuest.IJoin,
    },
  );
  typia.assert(secondJoin);
  // 4. Verify the guest id is the same (no duplicate account created)
  TestValidator.equals(
    "guest id should be identical (no duplicate account)",
    secondJoin.id,
    firstGuestId,
  );
  // 5. Verify the device_fingerprint matches
  TestValidator.equals(
    "device fingerprint should match original",
    secondJoin.device_fingerprint,
    deviceFingerprint,
  );
  // 6. Verify created_at timestamp is unchanged (original account creation time)
  TestValidator.equals(
    "created_at should remain unchanged",
    secondJoin.created_at,
    firstCreatedAt,
  );
  // 7. Verify updated_at timestamp is updated (reflects re-join operation)
  TestValidator.notEquals(
    "updated_at should be updated on re-join",
    secondJoin.updated_at,
    firstUpdatedAt,
  );
  // Verify updated_at is later than first updated_at
  TestValidator.predicate(
    "updated_at should be later than original",
    new Date(secondJoin.updated_at).getTime() >
      new Date(firstUpdatedAt).getTime(),
  );
  // 8. Verify new tokens are issued (tokens should be different)
  TestValidator.notEquals(
    "access token should be refreshed",
    secondJoin.token.access,
    firstAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be refreshed",
    secondJoin.token.refresh,
    firstRefreshToken,
  );
  // 9. Verify token expiration timestamps are valid and in the future
  TestValidator.predicate(
    "new access token expiration should be in the future",
    new Date(secondJoin.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "new refresh token expiration should be in the future",
    new Date(secondJoin.token.refreshable_until).getTime() > Date.now(),
  );
  // Verify deleted_at is null (account is active)
  TestValidator.equals(
    "deleted_at should be null (active account)",
    secondJoin.deleted_at,
    null,
  );
}
