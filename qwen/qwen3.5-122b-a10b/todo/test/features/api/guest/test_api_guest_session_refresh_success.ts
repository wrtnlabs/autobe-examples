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
 * Test guest session refresh success path.
 *
 * Validates that a guest user can successfully refresh their session token, extending the session lifetime while maintaining identity consistency. This test ensures the refresh mechanism properly generates new tokens, extends expiration timestamps, and preserves guest identity across refresh operations.
 *
 * The test follows the complete refresh workflow: initial guest registration, token storage, refresh invocation, and comprehensive validation of the refreshed session state. Special attention is given to verifying token rotation (new access token), expiration extension, and identity preservation.
 *
 * 1. Create guest session with randomized device fingerprint and context
 * 2. Store original token details (access token, expired_at, guest id, fingerprint)
 * 3. Call refresh endpoint with current session token
 * 4. Validate new access token differs from original
 * 5. Validate expired_at timestamp is extended (later than original)
 * 6. Validate guest id remains identical
 * 7. Validate device_fingerprint remains identical
 */
export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session to obtain initial token for refresh
  const guestConnection: api.IConnection = { host: connection.host };
  const originalAuth: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppGuest.IJoin,
    },
  );
  typia.assert(originalAuth);
  // Store original token details for comparison
  const originalAccessToken: string = originalAuth.token.access;
  const originalExpiredAt: Date = new Date(originalAuth.token.expired_at);
  const originalGuestId: string = originalAuth.id;
  const originalFingerprint: string = originalAuth.device_fingerprint;
  // 2. Refresh the session token
  const refreshedAuth: ITodoAppGuest.IAuthorized =
    await authorize_guest_refresh(guestConnection, {
      body: {
        token: originalAccessToken,
      } satisfies ITodoAppGuest.IRefresh,
    });
  typia.assert(refreshedAuth);
  // 3. Validate the refreshed session
  // New access token should be different from original
  TestValidator.notEquals(
    "access token should be rotated",
    originalAccessToken,
    refreshedAuth.token.access,
  );
  // New expired_at should be later than original (session extended)
  const refreshedExpiredAt: Date = new Date(refreshedAuth.token.expired_at);
  TestValidator.predicate(
    "expired_at should be extended",
    refreshedExpiredAt.getTime() > originalExpiredAt.getTime(),
  );
  // Guest identity should remain consistent
  TestValidator.equals(
    "guest id should remain identical",
    originalGuestId,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "device_fingerprint should remain identical",
    originalFingerprint,
    refreshedAuth.device_fingerprint,
  );
}
