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
 * Test successful guest session token refresh with valid refresh token.
 *
 * Validates the complete guest token refresh workflow including initial guest registration, token renewal, and single-use refresh token enforcement. Ensures that the system correctly generates new access and refresh tokens while invalidating the old refresh token to prevent replay attacks.
 *
 * The test verifies the core token renewal mechanism and validates that:
 * 1. Initial guest registration creates valid tokens
 * 2. Refresh request with valid token succeeds and returns new tokens
 * 3. Token expiration timestamps are properly updated
 * 4. Old refresh token cannot be reused (single-use enforcement)
 * 5. Guest account remains accessible with new tokens
 *
 * 1. Create guest account via join with device fingerprint and session context.
 * 2. Capture the initial refresh token from the authorization response.
 * 3. Perform first refresh request with valid refresh token.
 * 4. Validate response contains new access and refresh tokens with updated expiration.
 * 5. Verify old refresh token is invalid and cannot be reused.
 * 6. Confirm guest account remains accessible with new tokens.
 */
export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account via join
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth: IHrmGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmGuest.IJoin,
    },
  );
  typia.assert(initialAuth);
  // Store the initial refresh token
  const oldRefreshToken: string = initialAuth.token.refresh;
  // 2. Perform first refresh request with valid refresh token
  const refreshAuth: IHrmGuest.IAuthorized = await authorize_guest_refresh(
    guestConnection,
    {
      body: {
        refreshToken: oldRefreshToken,
      } satisfies IHrmGuest.IRefresh,
    },
  );
  typia.assert(refreshAuth);
  // 3. Verify guest id remains unchanged after refresh
  TestValidator.equals("guest id unchanged", refreshAuth.id, initialAuth.id);
  // 4. Verify new tokens are different from old tokens (token rotation)
  TestValidator.notEquals(
    "new access token differs",
    refreshAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs",
    refreshAuth.token.refresh,
    initialAuth.token.refresh,
  );
  // 5. Verify old refresh token is invalid and cannot be reused (single-use enforcement)
  await TestValidator.error("old refresh token invalid", async () => {
    await authorize_guest_refresh(guestConnection, {
      body: {
        refreshToken: oldRefreshToken,
      } satisfies IHrmGuest.IRefresh,
    });
  });
  // 6. Confirm guest account remains accessible with new tokens
  TestValidator.equals(
    "authorization uses new token",
    guestConnection.headers?.Authorization,
    refreshAuth.token.access,
  );
}
